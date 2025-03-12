import { Data, Schema } from "effect";
import { Cuid2Schema } from "../cuid2/schema";

export const ComputeSchema = Schema.Struct({});

export type Compute = typeof ComputeSchema.Type;

export const TaskResourceSchema = Cuid2Schema;

export const TaskDependencySchema = Cuid2Schema;

const BaseComputeSchema = Schema.Struct({
  id: Cuid2Schema,
  result: Schema.optional(Schema.Any),
  errors: Schema.optional(Schema.Array(Schema.Any)),
  duration: Schema.optional(Schema.Duration),
  resources: Schema.optional(Schema.Array(TaskResourceSchema)),
  dependencies: Schema.optional(Schema.Array(TaskDependencySchema)),
  timeout: Schema.optional(Schema.Duration),
});

export const ComputeTaskSchema = Schema.Struct({
  ...BaseComputeSchema.fields,
  type: Schema.Literal("task"),
  config: Schema.Struct({
    script: Schema.optional(Schema.String),
    payload: Schema.optional(Schema.Any),
  }),
});

export const ComputeBinarySchema = Schema.Struct({
  ...BaseComputeSchema.fields,
  type: Schema.Literal("binary"),
  download_url: Schema.String,
  local_path: Schema.optional(Schema.String),
  config: Schema.Any,
});

export const ComputeUnitSchema = Schema.Union(ComputeTaskSchema, ComputeBinarySchema);

export type ComputeUnit = typeof ComputeUnitSchema.Type;
export type ComputeTask = typeof ComputeTaskSchema.Type;
export type ComputeBinary = typeof ComputeBinarySchema.Type;

export type ComputeStatusEnum = Data.TaggedEnum<{
  Uninitialized: {};
  Initializing: {};
  Initialized: {};
  Running: {};
  Completed: { exit_code: number };
  Failed: { error: string };
  Paused: {};
  Interrupted: { signal: string };
  Killed: { signal: string };
  Deadlocked: {};
  Timeout: {
    reason?: string;
  };
}>;

export const ComputeStatus = Data.taggedEnum<ComputeStatusEnum>();
export const ComputeStatusSchema = Data.struct(ComputeStatus);
