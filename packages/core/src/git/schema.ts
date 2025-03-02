import { Schema } from "effect";

export const GitSchema = Schema.Struct({
  repository: Schema.URL,
  branch: Schema.optional(Schema.String),
  commit: Schema.optional(Schema.String),
  environment: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.String,
    })
  ),
  working_directory: Schema.optional(Schema.String),
});

export type Git = typeof GitSchema.Type;
