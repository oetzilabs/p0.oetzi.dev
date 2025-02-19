import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";
import { Authorization } from "../middlewares/authorization";
import {
  ActorAlreadyDeleted,
  ActorAlreadyExists,
  ActorNotCreated,
  ActorNotDeleted,
  ActorNotFound,
} from "../models/actors/errors";
import { CreateActorSchema, ListActorsSchema, NullableActorSchema } from "../models/actors/schemas";

const ActorIdParam = HttpApiSchema.param("sid", Schema.String);

export class UnknownException extends Schema.TaggedError<UnknownException>()("UnknownException", {}) {}

export const ActorsGroup = HttpApiGroup.make("Actors")
  .add(
    HttpApiEndpoint.get("listAllActors")`/all`
      .addError(UnknownException, { status: 500 })
      .addSuccess(
        ListActorsSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
      .middleware(Authorization)
  )
  .add(
    HttpApiEndpoint.get("listNonDeletedActors")`/non-deleted`
      .addError(UnknownException, { status: 500 })
      .addSuccess(
        ListActorsSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
      .middleware(Authorization)
  )
  .add(
    HttpApiEndpoint.get("getActor")`/${ActorIdParam}`
      .addError(UnknownException, { status: 500 })
      .addError(ActorNotFound, { status: 404 })
      .addSuccess(
        NullableActorSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
      .middleware(Authorization)
  )
  .add(
    HttpApiEndpoint.post("createActor")`/`
      .addError(UnknownException, { status: 500 })
      .addError(ActorNotCreated, { status: 400 })
      .addError(ActorAlreadyExists, { status: 409 })
      .setPayload(
        CreateActorSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
      .addSuccess(
        NullableActorSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
  )
  .add(
    HttpApiEndpoint.del("deleteActor")`/${ActorIdParam}`
      .addError(UnknownException, { status: 500 })
      .addError(ActorNotFound, { status: 404 })
      .addError(ActorAlreadyDeleted, { status: 409 })
      .addError(ActorNotDeleted, { status: 400 })
      .addSuccess(
        NullableActorSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
      .middleware(Authorization)
  )
  .prefix("/actors");

// Define the API
export const ActorsApi = HttpApi.make("AllApi").add(ActorsGroup);
