import { Data, Schema } from "effect";
import { Cuid2Schema } from "../cuid2/schema";

export const ComputeSchema = Schema.Struct({});

export type Compute = typeof ComputeSchema.Type;

export const ComputeTaskConfigSchema = Schema.Struct({});
export type ComputeTaskConfig = typeof ComputeTaskConfigSchema.Type;

export const ComputeTaskSchema = Schema.Struct({
  id: Cuid2Schema,
  payload: Schema.Any,
  config: ComputeTaskConfigSchema,
});

export type ComputeTask = typeof ComputeTaskSchema.Type;

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
