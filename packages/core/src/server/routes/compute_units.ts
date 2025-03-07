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
  ComputeUnitBinaryNotCreated,
  ComputeUnitBinaryAlreadyExists,
  ComputeUnitBinaryNotFound,
  ComputeUnitBinaryAlreadyDeleted,
  ComputeUnitBinaryNotDeleted,
  ComputeUnitBinaryNotUnregistered,
  ComputeUnitNotFound,
  ComputeUnitBinaryNotUpdated,
} from "../models/compute_units/errors";
import {
  CreateComputeUnitSchema,
  CreateComputeBinaryUnitSchema,
  ListComputeUnitsSchema,
  NullableComputeUnitSchema,
} from "../models/compute_units/schemas";
import { Cuid2Schema } from "../../cuid2";
import { ComputeBinaryNotDownloaded, ComputeBinaryNotExecuted } from "../../compute/errors";

const ComputeUnitIdParam = HttpApiSchema.param("cuid", Cuid2Schema);

export class UnknownException extends Schema.TaggedError<UnknownException>()("UnknownException", {}) {}

export const ComputeUnitsGroup = HttpApiGroup.make("ComputeUnits")
  .add(
    HttpApiEndpoint.post("register_task")`/task`
      .addError(UnknownException, { status: 500 })
      .addError(ComputeUnitTaskNotCreated, { status: 400 })
      .addError(ComputeUnitBinaryNotCreated, { status: 400 })
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
    HttpApiEndpoint.post("register_binary")`/binary`
      .addError(UnknownException, { status: 500 })
      .addError(ComputeUnitTaskNotCreated, { status: 400 })
      .addError(ComputeUnitBinaryNotCreated, { status: 400 })
      .addError(ComputeUnitTaskAlreadyExists, { status: 409 })
      .addError(ComputeUnitBinaryAlreadyExists, { status: 409 })
      .setPayload(
        CreateComputeBinaryUnitSchema.pipe(
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
    HttpApiEndpoint.del("unregister_task")`/task/${ComputeUnitIdParam}`
      .addError(UnknownException, { status: 500 })
      .addError(ComputeUnitNotFound, { status: 404 })
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
    HttpApiEndpoint.del("unregister_binary")`/binary/${ComputeUnitIdParam}`
      .addError(UnknownException, { status: 500 })
      .addError(ComputeUnitNotFound, { status: 404 })
      .addError(ComputeUnitBinaryNotFound, { status: 404 })
      .addError(ComputeUnitBinaryNotUnregistered, { status: 400 })
      .addError(ComputeUnitBinaryAlreadyDeleted, { status: 409 })
      .addError(ComputeUnitBinaryNotDeleted, { status: 409 })
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
    HttpApiEndpoint.post("run_task")`/task/${ComputeUnitIdParam}`
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
  .add(
    HttpApiEndpoint.post("run_binary")`/binary/${ComputeUnitIdParam}`
      .addError(UnknownException, { status: 500 })
      .addError(ComputeUnitNotFound, { status: 404 })
      .addError(ComputeUnitTaskFailedExecution, { status: 400 })
      .addError(ComputeUnitBinaryNotUpdated, { status: 400 })
      .addError(ComputeUnitBinaryNotFound, { status: 404 })
      .addError(ComputeBinaryNotDownloaded, { status: 400 })
      .addError(ComputeUnitTaskNotFound, { status: 404 })
      .addError(ComputeBinaryNotExecuted, { status: 400 })
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
