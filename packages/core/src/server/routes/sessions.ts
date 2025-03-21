import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, HttpApiSecurity } from "@effect/platform";
import { Schema } from "effect";
import {
  SessionAlreadyDeleted,
  SessionAlreadyExists,
  SessionNotCreated,
  SessionNotDeleted,
  SessionNotFound,
} from "../models/sessions/errors";
import { CreateSessionSchema, ListSessionsSchema, NullableSessionSchema } from "../models/sessions/schemas";
import { Authorization } from "../middlewares/authorization";

export const BearerApiSecurity = HttpApiSecurity.apiKey({
  in: "cookie",
  key: "bearer_token",
});

const SessionIdParam = HttpApiSchema.param("session_id", Schema.String);

export class UnknownException extends Schema.TaggedError<UnknownException>()("UnknownException", {}) {}

export const SessionGroup = HttpApiGroup.make("Session")
  .add(
    HttpApiEndpoint.get("listAllSessions")`/all`
      .addError(UnknownException, { status: 500 })
      .addError(SessionNotFound, { status: 404 })
      .addSuccess(
        ListSessionsSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
      .middleware(Authorization)
  )
  .add(
    HttpApiEndpoint.get("getSession")`/${SessionIdParam}`
      .addError(UnknownException, { status: 500 })
      .addError(SessionNotFound, { status: 404 })
      .addSuccess(
        NullableSessionSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
      .middleware(Authorization)
  )
  .add(
    HttpApiEndpoint.post("createSession")`/login`
      .addError(UnknownException, { status: 500 })
      .addError(SessionNotCreated, { status: 400 })
      .addError(SessionAlreadyExists, { status: 409 })
      .setPayload(
        CreateSessionSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
      .addSuccess(
        NullableSessionSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
  )
  .add(
    HttpApiEndpoint.del("deleteSession")`/logout/${SessionIdParam}`
      .addError(UnknownException, { status: 500 })
      .addError(SessionNotFound, { status: 404 })
      .addError(SessionAlreadyDeleted, { status: 409 })
      .addError(SessionNotDeleted, { status: 400 })
      .addSuccess(
        NullableSessionSchema.pipe(
          HttpApiSchema.withEncoding({
            kind: "Json",
            contentType: "application/json",
          })
        )
      )
      .middleware(Authorization)
  )
  .prefix("/sessions");
