import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";
import { Authorization } from "../middlewares/authorization";
import {
  BrokerAlreadyDeleted,
  BrokerAlreadyExists,
  BrokerNotCreated,
  BrokerNotDeleted,
  BrokerNotFound,
} from "../models/brokers/errors";
import { CreateBrokerSchema, ListBrokersSchema, NullableBrokerSchema } from "../models/brokers/schemas";

const BrokerIdParam = HttpApiSchema.param("bid", Schema.String);

export class UnknownException extends Schema.TaggedError<UnknownException>()("UnknownException", {}) {}

export const BrokersGroup = HttpApiGroup.make("Brokers")
  .add(
    HttpApiEndpoint.get("listAllBrokers")`/all`.addError(UnknownException, { status: 500 }).addSuccess(
      ListBrokersSchema.pipe(
        HttpApiSchema.withEncoding({
          kind: "Json",
          contentType: "application/json",
        })
      )
    )
  )
  .add(
    HttpApiEndpoint.get("listNonDeletedBrokers")`/non-deleted`.addError(UnknownException, { status: 500 }).addSuccess(
      ListBrokersSchema.pipe(
        HttpApiSchema.withEncoding({
          kind: "Json",
          contentType: "application/json",
        })
      )
    )
  )
  .add(
    HttpApiEndpoint.get("getBroker")`/${BrokerIdParam}`
      .addError(UnknownException, { status: 500 })
      .addError(BrokerNotFound, { status: 404 })
      .addSuccess(
        NullableBrokerSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
  )
  .add(
    HttpApiEndpoint.post("createBrokers")`/`
      .addError(UnknownException, { status: 500 })
      .addError(BrokerNotCreated, { status: 400 })
      .addError(BrokerAlreadyExists, { status: 409 })
      .setPayload(
        CreateBrokerSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
      .addSuccess(
        NullableBrokerSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
  )
  .add(
    HttpApiEndpoint.del("deleteBroker")`/${BrokerIdParam}`
      .addError(UnknownException, { status: 500 })
      .addError(BrokerNotFound, { status: 404 })
      .addError(BrokerAlreadyDeleted, { status: 409 })
      .addError(BrokerNotDeleted, { status: 400 })
      .addSuccess(
        NullableBrokerSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
  )
  .middleware(Authorization)
  .prefix("/brokers");
