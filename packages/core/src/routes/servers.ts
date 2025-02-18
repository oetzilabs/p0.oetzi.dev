import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import {
  ServerAlreadyDeleted,
  ServerAlreadyExists,
  ServerNotCreated,
  ServerNotDeleted,
  ServerNotFound,
} from "@p0/core/src/entities/server/errors";
import { Effect, Layer, pipe, Schema } from "effect";
import { ServerRepository } from "../entities/server/repository";
import { CreateServerSchema, ListServersSchema, NullableServerSchema } from "../entities/server/schemas";

const ServerIdParam = HttpApiSchema.param("sid", Schema.String);

export class UnknownException extends Schema.TaggedError<UnknownException>()("UnknownException", {}) {}

// Define the API
export const ServersApi = HttpApi.make("ServersApi")
  .add(
    HttpApiGroup.make("Servers")
      .add(
        HttpApiEndpoint.get("listAllServers")`/all`.addError(UnknownException, { status: 500 }).addSuccess(
          ListServersSchema.pipe(
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
            ListServersSchema.pipe(
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
          .addError(ServerNotFound, { status: 404 })
          .addSuccess(
            NullableServerSchema.pipe(
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
          .addError(ServerNotCreated, { status: 400 })
          .addError(ServerAlreadyExists, { status: 409 })
          .setPayload(
            CreateServerSchema.pipe(
              HttpApiSchema.withEncoding({
                kind: "Json",
                contentType: "application/json",
              })
            )
          )
          .addSuccess(
            NullableServerSchema.pipe(
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
          .addError(ServerNotFound, { status: 404 })
          .addError(ServerAlreadyDeleted, { status: 409 })
          .addError(ServerNotDeleted, { status: 400 })
          .addSuccess(
            NullableServerSchema.pipe(
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
    const repo = yield* _(ServerRepository);
    return handlers
      .handle("listNonDeletedServers", () => pipe(repo.all_non_deleted))
      .handle("listAllServers", () => pipe(repo.all))
      .handle("getServer", (params) => pipe(repo.find_by_id(params.path.sid)))
      .handle("deleteServer", (params) => pipe(repo.remove(params.path.sid)))
      .handle("createServers", (params) => pipe(repo.create(params.payload)));
  })
);

export const ServerLive = HttpApiBuilder.api(ServersApi).pipe(Layer.provide(ServersApiLive));
