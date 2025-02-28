import { Data, Effect, Schema, String, SubscriptionRef } from "effect";
import { createId, isCuid } from "@paralleldrive/cuid2";
import { FileSystem, Path } from "@effect/platform";
import { BunFileSystem } from "@effect/platform-bun";
import { ProjectIdNotCuid2, ProjectNotInStore, ProjectStoreDoesNotExist } from "./errors";

export type ProjectStatusEnum = Data.TaggedEnum<{
  Loading: {};
  Registered: {};
  Stopped: { readonly reason: string };
  Running: {};
}>;

export const ProjectStatus = Data.taggedEnum<ProjectStatusEnum>();
export const ProjectStatusSchema = Data.struct(ProjectStatus);

export const ProjectId = Schema.String.pipe(
  Schema.annotations({ identifier: "@p0/core/project/id" }),
  Schema.brand("ProjectId")
);

export type ProjectId = Schema.Schema.Type<typeof ProjectId>;

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
  static Schema = Schema.Struct({
    id: ProjectId,
    name: Schema.String,
    path: Schema.optional(Schema.String),
    dev: Schema.optional(Schema.Boolean),
    command: Schema.optional(Schema.Union(Schema.String, Schema.Tuple(Schema.String, Schema.Array(Schema.String)))),
    start_automatically: Schema.optional(Schema.Boolean),
  });

  static launch = (props: Omit<ProjectProps, "id" | "status"> | string) =>
    Effect.gen(function* (_) {
      if (typeof props === "string") {
        // check if props is a cuid string
        const is_valid_cuid = isCuid(props);
        if (!is_valid_cuid) {
          return yield* Effect.fail(ProjectIdNotCuid2.make({ id: props }));
        }
        const id = ProjectId.make(props);
        const project = yield* Project.load(id);
        return project;
      }
      const id = ProjectId.make(createId());
      const status = yield* _(SubscriptionRef.make<ProjectStatusEnum>(ProjectStatus.Loading()));
      return new Project({ ...props, id, status });
    });

  static load = (id: ProjectId) =>
    Effect.gen(function* (_) {
      // check if the project exists on the `projects` store (directory)
      const fs = yield* _(FileSystem.FileSystem);
      const fs_path = yield* _(Path.Path);
      // check if the store exists
      const cwd = process.cwd();
      const store = yield* fs.exists(fs_path.join(cwd, "projects"));
      if (!store) {
        return yield* Effect.fail(ProjectStoreDoesNotExist.make());
      }
      // check if the project exists
      const project_exists = yield* fs.exists(fs_path.join(cwd, "projects", `${id}.json`));
      if (!project_exists) {
        return yield* Effect.fail(ProjectNotInStore.make({ id }));
      }
      // does the project match the schema?
      const project_json = yield* fs.readFileString(fs_path.join(cwd, "projects", `${id}.json`), "utf-8");
      const project = yield* Project.decode(project_json).pipe(
        Effect.catchTags({
          ParseError: () => ProjectNotInStore.make({ id }),
        })
      );
      return project;
    }).pipe(Effect.provide(BunFileSystem.layer));

  static decode = (json: string) =>
    Effect.gen(function* (_) {
      const decoder = Schema.decodeUnknown(Project.Schema);
      const project = yield* decoder(json);
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
}
