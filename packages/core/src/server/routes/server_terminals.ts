import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, HttpApiSecurity } from "@effect/platform";
import { Schema } from "effect";
import {
  ServerTerminalAlreadyDeleted,
  ServerTerminalAlreadyExists,
  ServerTerminalNotCreated,
  ServerTerminalNotDeleted,
  ServerTerminalNotFound,
} from "../models/server_terminals/errors";
import { Authorization } from "../middlewares/authorization";
import {
  CreateServerTerminalSchema,
  ListServerTerminalsSchema,
  NullableServerTerminalSchema,
} from "../models/server_terminals/schemas";

export const BearerApiSecurity = HttpApiSecurity.apiKey({
  in: "cookie",
  key: "bearer_token",
});

const ServerIdParam = HttpApiSchema.param("server_id", Schema.String);
const ServerTerminalIdParam = HttpApiSchema.param("server_terminal_id", Schema.String);

export class UnknownException extends Schema.TaggedError<UnknownException>()("UnknownException", {}) {}

export const ServerTerminalsGroup = HttpApiGroup.make("ServerTerminal")
  .add(
    HttpApiEndpoint.get("listAllServerTerminals")`/all`
      .addError(UnknownException, { status: 500 })
      .addError(ServerTerminalNotFound, { status: 404 })
      .addSuccess(
        ListServerTerminalsSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
  )
  .add(
    HttpApiEndpoint.get("getServerTerminal")`/${ServerTerminalIdParam}`
      .addError(UnknownException, { status: 500 })
      .addError(ServerTerminalNotFound, { status: 404 })
      .addSuccess(
        NullableServerTerminalSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
  )
  .add(
    HttpApiEndpoint.post("createServerTerminal")`/create`
      .addError(UnknownException, { status: 500 })
      .addError(ServerTerminalNotCreated, { status: 400 })
      .addError(ServerTerminalAlreadyExists, { status: 409 })
      .setPayload(
        CreateServerTerminalSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
      .addSuccess(
        NullableServerTerminalSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
  )
  .add(
    HttpApiEndpoint.del("deleteServerTerminal")`/destroy/${ServerTerminalIdParam}`
      .addError(UnknownException, { status: 500 })
      .addError(ServerTerminalNotFound, { status: 404 })
      .addError(ServerTerminalAlreadyDeleted, { status: 409 })
      .addError(ServerTerminalNotDeleted, { status: 400 })
      .addSuccess(
        NullableServerTerminalSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
  )
  .middleware(Authorization)
  .prefix(`/servers/${ServerIdParam}/terminals`);
