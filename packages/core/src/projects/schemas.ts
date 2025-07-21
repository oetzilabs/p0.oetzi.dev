import { Data, Schema } from "effect";

export const ProjectId = Schema.String.pipe(
  Schema.annotations({ identifier: "@p0/core/project/id" }),
  Schema.brand("ProjectId")
);

export type ProjectId = Schema.Schema.Type<typeof ProjectId>;

export const ProjectTag = Schema.Literal("@p0/core/project");

export const preloader = Schema.Struct({
  _tag: ProjectTag,
  version: Schema.String,
});

export const blaizmon_1740868627 = Schema.Struct({
  // `digimon` and epoche time of publishing
  version: Schema.Literal("blaizmon_1740868627"),
  _tag: ProjectTag,
  // mark as experimental
  experimental: Schema.optional(Schema.Boolean),
  // mark as deprecated
  deprecated: Schema.optional(Schema.Boolean),
  id: ProjectId,
  name: Schema.String,
  path: Schema.optional(Schema.String),
  dev: Schema.optional(Schema.Boolean),
  command: Schema.optional(Schema.Union(Schema.String, Schema.Tuple(Schema.String, Schema.Array(Schema.String)))),
  start_automatically: Schema.optional(Schema.Boolean),
  environment: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
});

export const latest = Schema.Struct({
  ...blaizmon_1740868627.fields,
  // `digimon` and epoche time of publishing
  version: Schema.Literal("latest"),
});

// Experimental Schemas

export const experimental_1740918335 = Schema.Struct({
  // `digimon` and epoche time of publishing
  version: Schema.Literal("experimental_1740918335"),
  _tag: ProjectTag,
  // mark as experimental
  experimental: Schema.optional(Schema.Boolean),
  // mark as deprecated
  deprecated: Schema.optional(Schema.Boolean),
  id: ProjectId,
  name: Schema.String,
  path: Schema.optional(Schema.String),
  dev: Schema.optional(Schema.Boolean),
  command: Schema.optional(Schema.Union(Schema.String, Schema.Tuple(Schema.String, Schema.Array(Schema.String)))),
  start_automatically: Schema.optional(Schema.Boolean),
  environment: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
});

export type ProjectStatusEnum = Data.TaggedEnum<{
  Loading: {};
  Registered: {};
  Stopped: { readonly reason: string };
  Running: {};
}>;

export const ProjectStatus = Data.taggedEnum<ProjectStatusEnum>();
export const ProjectStatusSchema = Data.struct(ProjectStatus);
