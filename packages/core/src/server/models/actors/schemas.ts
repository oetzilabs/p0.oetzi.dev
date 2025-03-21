import { Schema } from "effect";

export const CreateActorSchema = Schema.Struct({
  name: Schema.String,
});

export const RemoveActorSchema = Schema.String;

export const ActorSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.NullOr(Schema.DateFromString),
  deletedAt: Schema.NullOr(Schema.DateFromString),
});

export const NullableActorSchema = Schema.NullOr(ActorSchema);
export const UndefinableActorSchema = Schema.UndefinedOr(ActorSchema);

export const ListActorsSchema = Schema.Array(ActorSchema);

export const GetActorByIdParamSchema = Schema.Struct({
  sid: Schema.String,
});

export const FindActorByNameSchema = Schema.String;
