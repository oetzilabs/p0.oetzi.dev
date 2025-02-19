import { Schema } from "effect";

export const CreateSessionSchema = Schema.Struct({
  actor_id: Schema.String,
});
export const RemoveSessionSchema = Schema.String;

export const SessionSchema = Schema.Struct({
  id: Schema.String,
  actor_id: Schema.String,
  bearer_token: Schema.String,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.NullOr(Schema.DateFromString),
  deletedAt: Schema.NullOr(Schema.DateFromString),
});

export const NullableSessionSchema = Schema.NullOr(SessionSchema);

export const ListSessionsSchema = Schema.Array(SessionSchema);

export const GetSessionByIdParamSchema = Schema.Struct({
  session_id: Schema.String,
});
