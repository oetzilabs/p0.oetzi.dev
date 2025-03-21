import { Schema } from "effect";

export const CreateBrokerSchema = Schema.Struct({
  url: Schema.String,
});

export const RemoveBrokerSchema = Schema.String;

export const BrokerSchema = Schema.Struct({
  id: Schema.String,
  url: Schema.String,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.NullOr(Schema.DateFromString),
  deletedAt: Schema.NullOr(Schema.DateFromString),
});

export const NullableBrokerSchema = Schema.NullOr(BrokerSchema);
export const UndefinableBrokerSchema = Schema.UndefinedOr(BrokerSchema);

export const ListBrokersSchema = Schema.Array(BrokerSchema);

export const GetBrokerByIdParamSchema = Schema.Struct({
  bid: Schema.String,
});

export const FindBrokerByNameSchema = Schema.String;
