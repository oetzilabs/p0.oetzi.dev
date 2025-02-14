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
  createdAt: Schema.DateFromSelf.annotations({ jsonSchema: Date }),
  updatedAt: Schema.NullOr(Schema.DateFromSelf.annotations({ jsonSchema: Date })),
  deletedAt: Schema.NullOr(Schema.DateFromSelf.annotations({ jsonSchema: Date })),
});

export const NullableServerSchema = Schema.NullOr(ServerSchema);

export const ListServersSchema = Schema.Array(ServerSchema);

export const GetServerByIdParamSchema = Schema.Struct({
  sid: Schema.String,
});
