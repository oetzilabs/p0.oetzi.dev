import { FileSystem, Path } from "@effect/platform";
import { createId, isCuid } from "@paralleldrive/cuid2";
import { Data, Effect, Schema, SubscriptionRef } from "effect";
import { BaseLoggerService } from "../logger";
import { ProjectIdNotCuid2, ProjectNotInStore, ProjectNotJson, ProjectStoreDoesNotExist } from "./errors";
import { blaizmon_1740868627, ProjectId, ProjectStatus, type ProjectStatusEnum } from "./schemas";

export type ProjectProps = {
  id: ProjectId;
  name: string;
  path?: string;
  dev?: boolean | undefined;
  command?: [string, ...string[]] | string;
  start_automatically?: boolean | undefined;
  status: SubscriptionRef.SubscriptionRef<ProjectStatusEnum>;
};

export class Project extends Data.TaggedClass("@p0/core/project")<ProjectProps> {
  static Schemas = Schema.Struct({
    latest: blaizmon_1740868627,
    blaizmon_1740868627: blaizmon_1740868627,
  });

  static Schema = Project.Schemas.fields.latest;

  static #JsonSchema = Schema.parseJson(Project.Schemas.fields.blaizmon_1740868627);

  static #parseJson = Schema.decodeUnknown(Project.#JsonSchema);

  static launch = (props: Omit<ProjectProps, "id" | "status"> | string) =>
    Effect.gen(function* (_) {
      const logger = yield* _(BaseLoggerService);
      const log = logger.withGroup("project#launch");
      if (typeof props === "string") {
        // check if props is a cuid string
        const has_folder_prefix = props.split("/").length > 1;
        let base_path = "projects";
        let possible_cuid = props;
        if (has_folder_prefix) {
          // example: `[example/projects/]wo65y7c2jgw6xfp5zf2mq46o`
          // so we need to split the string and get the parts before the LAST `/`
          base_path = props.split("/").slice(0, -1).join("/");
          yield* log.info("project_base_path", base_path);
          // example: `example/projects/[wo65y7c2jgw6xfp5zf2mq46o]`
          possible_cuid = props.split("/").slice(-1)[0];
          yield* log.info("project_possible_cuid", possible_cuid);
        }
        const is_valid_cuid = isCuid(possible_cuid);
        if (is_valid_cuid) {
          yield* log.info("project_id is_valid_cuid", props);
          const id = ProjectId.make(possible_cuid);
          const project = yield* Project.#load(id, base_path);
          return project;
        } else {
          const is_json = yield* Project.#isJson(props);
          if (is_json) {
            yield* log.info("project_id is_json", props);
            const project = yield* Project.#decode(props);
            yield* log.info("project_decoded", project);
            return project;
          } else {
            return yield* Effect.fail(ProjectIdNotCuid2.make({ id: props }));
          }
        }
      }
      const id = ProjectId.make(createId());
      const status = yield* _(SubscriptionRef.make<ProjectStatusEnum>(ProjectStatus.Loading()));
      return new Project({ ...props, id, status });
    });

  static #load = (id: ProjectId, base_path: string = "projects") =>
    Effect.gen(function* (_) {
      const logger = yield* _(BaseLoggerService);
      const log = logger.withGroup("project#load");
      // check if the project exists on the `projects` store (directory)
      const fs = yield* _(FileSystem.FileSystem);
      const fs_path = yield* _(Path.Path);
      // check if the store exists
      const cwd = process.cwd();
      const store_path = fs_path.join(cwd, base_path);
      const store = yield* fs.exists(store_path);
      if (!store) {
        yield* log.error("store_not_found", store_path);
        return yield* Effect.fail(ProjectStoreDoesNotExist.make());
      }
      // check if the project exists
      const project_path = fs_path.join(store_path, `${id}.json`);
      yield* log.info("project_path", project_path);
      const project_exists = yield* fs.exists(project_path);
      if (!project_exists) {
        yield* log.error("project_not_found", project_path);
        return yield* Effect.fail(ProjectNotInStore.make({ id }));
      }
      yield* log.info("project_exists", project_path);
      // does the project match the schema?
      const project_json = yield* fs.readFileString(project_path);
      yield* log.info("project_json", project_json);
      const is_json = yield* Project.#isJson(project_json);
      if (!is_json) {
        yield* log.error("project_not_json", project_path);
        return yield* Effect.fail(ProjectNotJson.make({ json: project_json }));
      }
      yield* log.info("project_is_json", project_path, project_json);
      const project = yield* Project.#decode(project_json);
      // yield* log.info("project_is_json", project_path, project_json, project);
      return project;
    });

  static #decode = (json: string) =>
    Effect.gen(function* (_) {
      const logger = yield* _(BaseLoggerService);
      const log = logger.withGroup("project#decode");
      // yield* log.info("project_json", json);
      const project = yield* Project.#parseJson(json);
      yield* log.info("project_decoded:TESTESTESTESTEST", project);
      const status = yield* SubscriptionRef.make<ProjectStatusEnum>(ProjectStatus.Loading());
      // TODO: fix this, this is a workaround... The types are readonly via schema, so we have to cast it.
      // This is a problem with the schema, we should be able to do this in the schema.
      let command: ProjectProps["command"] = undefined;
      if (project.command !== undefined) {
        if (typeof project.command === "string") {
          command = project.command.split(" ") as [string, ...string[]];
        } else if (Array.isArray(project.command)) {
          command = [project.command[0], ...project.command[1]];
        }
      }
      return new Project({ ...project, command, status });
    });

  static #isJson = (json: string) => {
    return Project.#parseJson(json).pipe(
      Effect.map((x) => !!x),
      Effect.catchTags({ ParseError: () => Effect.succeed(false) })
    );
  };
}
