import { Schema } from "effect";
import { Cuid2Schema } from "../../../cuid2";

export class ComputeUnitTaskNotFound extends Schema.TaggedError<ComputeUnitTaskNotFound>()(
  "ComputeUnitTaskNotFound",
  {}
) {}

export class ComputeUnitTaskAlreadyExists extends Schema.TaggedError<ComputeUnitTaskAlreadyExists>()(
  "ComputeUnitTaskAlreadyExists",
  {}
) {}

export class ComputeUnitTaskNotDeleted extends Schema.TaggedError<ComputeUnitTaskNotDeleted>()(
  "ComputeUnitTaskNotDeleted",
  {}
) {}

export class ComputeUnitTaskNotUpdated extends Schema.TaggedError<ComputeUnitTaskNotUpdated>()(
  "ComputeUnitTaskNotUpdated",
  {}
) {}

export class ComputeUnitTaskNotCreated extends Schema.TaggedError<ComputeUnitTaskNotCreated>()(
  "ComputeUnitTaskNotCreated",
  {
    id: Cuid2Schema,
    error: Schema.optional(Schema.String),
  }
) {}

export class ComputeUnitTaskAlreadyDeleted extends Schema.TaggedError<ComputeUnitTaskAlreadyDeleted>()(
  "ComputeUnitTaskAlreadyDeleted",
  {}
) {}

export class ComputeUnitTaskFailedExecution extends Schema.TaggedError<ComputeUnitTaskFailedExecution>()(
  "ComputeUnitTaskFailedExecution",
  {
    error: Schema.String,
  }
) {}

export class ComputeUnitTaskNotUnregistered extends Schema.TaggedError<ComputeUnitTaskNotUnregistered>()(
  "ComputeUnitTaskNotUnregistered",
  {
    id: Cuid2Schema,
    error: Schema.String,
  }
) {}
