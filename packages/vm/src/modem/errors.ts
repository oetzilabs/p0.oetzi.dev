import { Schema } from "effect";

export class ModemPayloadError extends Schema.TaggedError<ModemPayloadError>()("ModemPayloadError", {
  cause: Schema.optional(Schema.Any),
  message: Schema.String,
  statusCode: Schema.optional(Schema.Number),
  json: Schema.optional(Schema.Any),
}) {}
