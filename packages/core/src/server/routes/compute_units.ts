import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";
import { Authorization } from "../middlewares/authorization";
import {
  ComputeUnitTaskAlreadyDeleted,
  ComputeUnitTaskAlreadyExists,
  ComputeUnitTaskFailedExecution,
  ComputeUnitTaskNotCreated,
  ComputeUnitTaskNotDeleted,
  ComputeUnitTaskNotFound,
  ComputeUnitTaskNotUnregistered,
} from "../models/compute_units/errors";
import {
  CreateComputeUnitSchema,
  ListComputeUnitsSchema,
  NullableComputeUnitSchema,
} from "../models/compute_units/schemas";
import { Cuid2Schema } from "../../cuid2";

const ComputeUnitIdParam = HttpApiSchema.param("cuid", Cuid2Schema);

export class UnknownException extends Schema.TaggedError<UnknownException>()("UnknownException", {}) {}

export const ComputeUnitsGroup = HttpApiGroup.make("ComputeUnits")
  .add(
    HttpApiEndpoint.post("register_task")`/`
      .addError(UnknownException, { status: 500 })
      .addError(ComputeUnitTaskNotCreated, { status: 400 })
      .addError(ComputeUnitTaskAlreadyExists, { status: 409 })
      .setPayload(
        CreateComputeUnitSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
      .addSuccess(
        Cuid2Schema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Text",
            contentType: "text/plain",
          })
        )
      )
  )
  .add(
    HttpApiEndpoint.del("unregister_task")`/${ComputeUnitIdParam}`
      .addError(UnknownException, { status: 500 })
      .addError(ComputeUnitTaskNotFound, { status: 404 })
      .addError(ComputeUnitTaskNotUnregistered, { status: 400 })
      .addError(ComputeUnitTaskAlreadyDeleted, { status: 409 })
      .addError(ComputeUnitTaskNotDeleted, { status: 400 })
      .addSuccess(
        Cuid2Schema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Text",
            contentType: "text/plain",
          })
        )
      )
  )
  .add(
    HttpApiEndpoint.post("run_task")`/${ComputeUnitIdParam}`
      .addError(UnknownException, { status: 500 })
      .addError(ComputeUnitTaskFailedExecution, { status: 400 })
      .addError(ComputeUnitTaskNotFound, { status: 404 })
      .addSuccess(
        Schema.Any.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
  )
  // .middleware(Authorization)
  .prefix("/compute_units");
