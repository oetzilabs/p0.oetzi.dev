import { Schema } from "effect";

export const CreateServerTerminalSchema = Schema.Struct({
  server_id: Schema.String,
});
export const RemoveServerTerminalSchema = Schema.String;

export const ServerTerminalSchema = Schema.Struct({
  id: Schema.String,
  server_id: Schema.String,
  link: Schema.String,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.NullOr(Schema.DateFromString),
  deletedAt: Schema.NullOr(Schema.DateFromString),
});

export const NullableServerTerminalSchema = Schema.NullOr(ServerTerminalSchema);

export const ListServerTerminalsSchema = Schema.Array(ServerTerminalSchema);

export const GetServerTerminalByIdParamSchema = Schema.Struct({
  terminal_id: Schema.String,
});
