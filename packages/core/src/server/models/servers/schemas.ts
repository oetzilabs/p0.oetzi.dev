import { Schema } from "effect";

const ServerStatusSchema = Schema.Literal(
  "available",
  "unavailable",
  "stopped",
  "starting",
  "stopping",
  "backing_up",
  "restoring",
  "unknown"
);

export const CreateServerSchema = Schema.Struct({
  name: Schema.String,
  url: Schema.String,
  status: Schema.optional(ServerStatusSchema),
});

export type CreateServer = Schema.Schema.Type<typeof CreateServerSchema>;

export const RemoveServerSchema = Schema.String;

export const ServerSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  url: Schema.String,
  status: ServerStatusSchema,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.NullOr(Schema.DateFromString),
  deletedAt: Schema.NullOr(Schema.DateFromString),
});

export type Server = Schema.Schema.Type<typeof ServerSchema>;

export const NullableServerSchema = Schema.NullOr(ServerSchema);
export const UndefinableServerSchema = Schema.UndefinedOr(ServerSchema);

export const ListServersSchema = Schema.Array(ServerSchema);

export const GetServerByIdParamSchema = Schema.Struct({
  sid: Schema.String,
});

export const FindServerByNameSchema = Schema.String;
