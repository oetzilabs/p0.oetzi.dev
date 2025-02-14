import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpClientResponse,
} from "@effect/platform";
import { Servers } from "@p0/core/src/entities/servers";
import { Effect, Either, Layer, Option, pipe, Schema } from "effect";
import { DatabaseLive } from "../db";

const ServerIdParam = HttpApiSchema.param("sid", Schema.String);

const WithDeletedParam = HttpApiSchema.param("deleted", Schema.String);

export class UnknownException extends Schema.TaggedError<UnknownException>()("UnknownException", {}) {}

// Define the API
export const ServersApi = HttpApi.make("ServersApi")
  .add(
    HttpApiGroup.make("Servers")
      .add(
        HttpApiEndpoint.get("listAllServers")`/all`.addError(UnknownException, { status: 500 }).addSuccess(
          Servers.ListServersSchema.pipe(
            HttpApiSchema.withEncoding({
              kind: "Json",
              contentType: "application/json",
            })
          )
        )
      )
      .add(
        HttpApiEndpoint.get("listNonDeletedServers")`/non-deleted`
          .addError(UnknownException, { status: 500 })
          .addSuccess(
            Servers.ListServersSchema.pipe(
              HttpApiSchema.withEncoding({
                kind: "Json",
                contentType: "application/json",
              })
            )
          )
      )
      .add(
        HttpApiEndpoint.get("getServer")`/${ServerIdParam}`
          .addError(UnknownException, { status: 500 })
          .addError(Servers.ServerNotFound, { status: 404 })
          .addSuccess(
            Servers.NullableServerSchema.pipe(
              HttpApiSchema.withEncoding({
                kind: "Json",
                contentType: "application/json",
              })
            )
          )
      )
      .add(
        HttpApiEndpoint.post("createServers")`/`
          .addError(UnknownException, { status: 500 })
          .addError(Servers.ServerNotCreated, { status: 400 })
          .setPayload(
            Servers.CreateServerSchema.pipe(
              HttpApiSchema.withEncoding({
                kind: "Json",
                contentType: "application/json",
              })
            )
          )
          .addSuccess(
            Schema.NullOr(Servers.ServerSchema).pipe(
              HttpApiSchema.withEncoding({
                kind: "Json",
                contentType: "application/json",
              })
            )
          )
      )
      .add(
        HttpApiEndpoint.del("deleteServer")`/${ServerIdParam}`
          .addError(UnknownException, { status: 500 })
          .addError(Servers.ServerNotFound, { status: 404 })
          .addError(Servers.ServerAlreadyDeleted, { status: 409 })
          .addError(Servers.ServerNotDeleted, { status: 400 })
          .addSuccess(
            Servers.NullableServerSchema.pipe(
              HttpApiSchema.withEncoding({
                kind: "Json",
                contentType: "application/json",
              })
            )
          )
      )
  )
  .prefix("/servers");
// Implement the API
export const ServersApiLive = HttpApiBuilder.group(ServersApi, "Servers", (handlers) =>
  Effect.gen(function* (_) {
    return handlers
      .handle("listNonDeletedServers", () =>
        pipe(
          Servers.all_non_deleted
          // Effect.either,
          // Effect.catchTags({
          //   UnknownException: (e) => Effect.fail(e),
          // })
        )
      )
      .handle("listAllServers", () =>
        pipe(
          Servers.all
          // Effect.either,
          // Effect.catchTags({
          //   UnknownException: (e) => Effect.fail(e),
          // })
        )
      )
      .handle("getServer", (params) =>
        pipe(
          Servers.find_by_id(params.path.sid)
          // Effect.catchTags({
          //   UnknownException: (e) => Effect.fail(e),
          // })
        )
      )
      .handle("deleteServer", (params) =>
        pipe(
          Servers.remove(params.path.sid),
          Effect.catchTags({
            UnknownException: (e) => Effect.fail(e),
          })
        )
      )
      .handle("createServers", (params) =>
        pipe(
          Servers.create(params.payload)
          // Effect.catchTags({
          //   UnknownException: (e) => Effect.fail(e),
          //   ServerNotCreated: (e) => Effect.fail(e),
          // })
        )
      );
  })
).pipe(Layer.provide([DatabaseLive]));

export const ServerLive = HttpApiBuilder.api(ServersApi).pipe(Layer.provide(ServersApiLive));
