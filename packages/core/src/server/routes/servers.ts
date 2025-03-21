import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";
import { Authorization } from "../middlewares/authorization";
import {
  ServerAlreadyDeleted,
  ServerAlreadyExists,
  ServerNotCreated,
  ServerNotDeleted,
  ServerNotFound,
} from "../models/servers/errors";
import { CreateServerSchema, ListServersSchema, NullableServerSchema } from "../models/servers/schemas";

const ServerIdParam = HttpApiSchema.param("sid", Schema.String);

export class UnknownException extends Schema.TaggedError<UnknownException>()("UnknownException", {}) {}

export const ServersGroup = HttpApiGroup.make("Servers")
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
    HttpApiEndpoint.get("listNonDeletedServers")`/non-deleted`.addError(UnknownException, { status: 500 }).addSuccess(
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
  .middleware(Authorization)
  .prefix("/servers");
