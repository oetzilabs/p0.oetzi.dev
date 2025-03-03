import { Command, FileSystem, Path } from "@effect/platform";
import { createId, isCuid } from "@paralleldrive/cuid2";
import { Data, Effect, Schema, SubscriptionRef } from "effect";
import { BaseLoggerService } from "../logger";
import { ProjectIdNotCuid2, ProjectNotInStore, ProjectNotJson, ProjectStoreDoesNotExist } from "./errors";
import {
  blaizmon_1740868627,
  experimental_1740918335,
  latest,
  preloader,
  ProjectId,
  ProjectStatus,
  type ProjectStatusEnum,
} from "./schemas";
import { GitService } from "../git";
import type { Prettify } from "valibot";

export type ProjectProps = {
  id: ProjectId;
  name: string;
  path?: string;
  dev?: boolean | undefined;
  command?: [string, ...string[]] | string;
  start_automatically?: boolean | undefined;
  status: SubscriptionRef.SubscriptionRef<ProjectStatusEnum>;
  environment?: Record<string, string | number | boolean>;
};

type SchemaKeys = keyof typeof Project.Schemas.fields;

type SchemaVariants = Exclude<SchemaKeys, "preloader">;

export class Project extends Data.TaggedClass("@p0/core/project")<ProjectProps> {
  static Schemas = Schema.Struct({
    latest: latest,
    blaizmon_1740868627: blaizmon_1740868627,
    experimental_1740918335: experimental_1740918335,
    preloader: preloader,
  });

  static Schema = Project.Schemas.fields.latest;

  static PreloadSchema = Project.Schemas.fields.preloader;

  static #JsonSchema = (key: SchemaVariants) =>
    Schema.parseJson(
      // @ts-expect-error We know that the key is a valid variant, since we are checking it in the schema.
      Project.Schemas.fields[key]
    );

  static launch = (props: Omit<ProjectProps, "id" | "status"> | string) =>
    Effect.gen(function* (_) {
      const git = yield* _(GitService);
      const status = yield* SubscriptionRef.make<ProjectStatusEnum>(ProjectStatus.Loading());

      if (typeof props === "string") {
        const git_url_validation = yield* git.validateUrl(props).pipe(
          Effect.catchTags({
            GitProjectDoesNotExist: () => Effect.succeed({ success: false, url: props }),
            InvalidGitUrl: () => Effect.succeed({ success: false, url: props }),
          })
        );

        if (git_url_validation.success) {
          // does the json file in the `projects` store already exist?
          const fs = yield* _(FileSystem.FileSystem);
          const fs_path = yield* _(Path.Path);
          const cwd = process.cwd();
          const store_path = fs_path.join(
            cwd,
            "projects",
            `${new URL(git_url_validation.url).pathname.split("/").slice(0, -1).join("/")}`
          );
          const store_exists = yield* fs.exists(store_path);
          if (store_exists) {
            // get the json file
            const project_json = yield* fs.readFileString(
              fs_path.join(store_path, `${new URL(git_url_validation.url).pathname.split("/").slice(-1)[0]}.json`)
            );
            const decoded = yield* Project.#decode(project_json);
            return yield* Project.#load(decoded.id);
          }
          return yield* Project.#git(git_url_validation.url);
        }

        // Existing logic for CUID and JSON project loading
        const has_folder_prefix = props.split("/").length > 1;
        let base_path = "projects";
        let possible_cuid = props;
        if (has_folder_prefix) {
          base_path = props.split("/").slice(0, -1).join("/");
          possible_cuid = props.split("/").slice(-1)[0];
        }
        const is_valid_cuid = isCuid(possible_cuid);
        if (is_valid_cuid) {
          const id = ProjectId.make(possible_cuid);
          const project = yield* Project.#load(id, base_path);
          return project;
        } else {
          const is_json = yield* Project.#isJson(props);
          if (is_json) {
            const project = yield* Project.#decode(props);
            return project;
          } else {
            return yield* Effect.fail(ProjectIdNotCuid2.make({ id: props }));
          }
        }
      }

      const id = ProjectId.make(createId());
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

  static #git = (git_url: string) =>
    Effect.gen(function* (_) {
      const git = yield* _(GitService);
      const fs = yield* _(FileSystem.FileSystem);
      const path = yield* _(Path.Path);
      const cwd = process.cwd();
      const status = yield* SubscriptionRef.make<ProjectStatusEnum>(ProjectStatus.Loading());

      const git_config = yield* git.toConfig(git_url);

      const repo = yield* git.exists(git_config);

      if (!repo) {
        const repo_local_path = yield* git.clone(git_config);

        const project_name = yield* git.basename(git_config.repository.pathname);

        const project_id = ProjectId.make(createId());

        const project = new Project({
          id: project_id,
          name: project_name,
          path: repo_local_path,
          start_automatically: false,
          environment: git_config.environment,
          status,
        });

        // Create and write the project JSON file
        const projectJsonPath = path.join(cwd, "projects", `${project_id}.json`);

        const project_json = yield* project.toJson();

        yield* fs.writeFileString(projectJsonPath, project_json, { flag: "w+" });

        return yield* Effect.succeed(project);
      } else {
        // iterate over the json files in `projects` and find the one with the working_directory
        const files = yield* fs.readDirectory(path.join(cwd, "projects"));
        const json_files = [];
        for (const file of files) {
          if (file.endsWith(".json")) {
            const f = yield* fs.readFileString(path.join(cwd, "projects", file));
            const is_json = Project.#isJson(f);
            if (is_json) {
              const project = yield* Project.#decode(f);
              if (project.path === git_config.working_directory) {
                json_files.push(project);
              }
            }
          }
        }

        if (json_files.length === 0) {
          return yield* Effect.fail(ProjectNotInStore.make({ id: git_config.working_directory }));
        }

        const the_project = json_files.find(
          (f) =>
            f.path === git.get_safe_local_path(git_config.repository.hostname, git_config.repository.pathname.slice(1))
        );

        if (!the_project) {
          return yield* Effect.fail(ProjectNotInStore.make({ id: git_config.working_directory }));
        }

        return yield* Effect.succeed(
          new Project({
            ...the_project,
            status,
          })
        );
      }
    });

  static #decode = (json: string) =>
    Effect.gen(function* (_) {
      const logger = yield* _(BaseLoggerService);
      const log = logger.withGroup("project#decode");

      const preloadJson = yield* Schema.decodeUnknown(Schema.parseJson(Project.Schemas.fields.preloader))(json).pipe(
        Effect.catchTag("ParseError", () => Effect.succeed(undefined))
      );
      if (!preloadJson) {
        yield* log.error("project_not_json", json);
        return yield* Effect.fail(ProjectNotJson.make({ json }));
      }
      if (!preloadJson.version) {
        yield* log.error("project_not_json", json);
        return yield* Effect.fail(ProjectNotJson.make({ json }));
      }
      let version = preloadJson.version as SchemaVariants;
      if (version in Project.Schemas.fields) {
        version = version as SchemaVariants;
      } else {
        version = "latest" as SchemaVariants;
      }
      const project = yield* Schema.decodeUnknown(Project.#JsonSchema(version))(json);
      yield* log.info("project_decoded", JSON.stringify(project));
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

  static #isJson = (json: string) =>
    Effect.gen(function* (_) {
      const preloadJson = yield* Schema.decodeUnknown(Schema.parseJson(Project.Schemas.fields.preloader))(json).pipe(
        Effect.catchTag("ParseError", () => Effect.succeed(undefined))
      );
      if (!preloadJson) {
        return yield* Effect.succeed(false);
      }
      let version = preloadJson.version;
      if (!version) {
        return yield* Effect.succeed(false);
      }
      return yield* Effect.succeed(version in Project.Schemas.fields);
    });

  toJson = () => {
    const that = this;
    return Effect.gen(function* (_) {
      let command_inversed: Parameters<typeof Project.Schemas.fields.latest.make>[0]["command"] = undefined;
      if (that.command !== undefined) {
        if (typeof that.command === "string") {
          command_inversed = that.command.split(" ") as unknown as readonly [string, readonly string[]];
        } else if (Array.isArray(that.command)) {
          command_inversed = [that.command[0], ...that.command.slice(1)] as unknown as readonly [
            string,
            readonly string[]
          ];
        }
      }
      const data = yield* Schema.encode(Project.Schemas.fields.latest)(
        Project.Schemas.fields.latest.make({
          ...that,
          version: "latest",
          _tag: "@p0/core/project",
          command: command_inversed,
        })
      );
      return JSON.stringify(data);
    });
  };
}
