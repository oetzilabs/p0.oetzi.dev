import { Schema } from "effect";

export const CreateServerSchema = Schema.Struct({
  name: Schema.String,
  url: Schema.String,
});
export const RemoveServerSchema = Schema.String;

export const ServerSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  url: Schema.String,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.NullOr(Schema.DateFromString),
  deletedAt: Schema.NullOr(Schema.DateFromString),
});

export const NullableServerSchema = Schema.NullOr(ServerSchema);
export const UndefinableServerSchema = Schema.UndefinedOr(ServerSchema);

export const ListServersSchema = Schema.Array(ServerSchema);

export const GetServerByIdParamSchema = Schema.Struct({
  sid: Schema.String,
});

export const FindServerByNameSchema = Schema.String;
