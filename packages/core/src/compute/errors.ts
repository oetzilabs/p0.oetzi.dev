import { Effect, Schema } from "effect";

export class ComputeNotAvailable extends Schema.TaggedError<ComputeNotAvailable>()("ComputeNotAvailable", {}) {}

export class ComputeOverloaded extends Schema.TaggedError<ComputeOverloaded>()("ComputeOverloaded", {
  id: Schema.String,
}) {}

export class ComputeShutdown extends Schema.TaggedError<ComputeShutdown>()("ComputeShutdown", {
  id: Schema.String,
}) {}

export class ComputeBinaryNotDownloaded extends Schema.TaggedError<ComputeBinaryNotDownloaded>()(
  "ComputeBinaryNotDownloaded",
  {
    error: Schema.String,
  }
) {}

export class ComputeBinaryNotExecuted extends Schema.TaggedError<ComputeBinaryNotExecuted>()(
  "ComputeBinaryNotExecuted",
  {
    error: Schema.String,
  }
) {}
