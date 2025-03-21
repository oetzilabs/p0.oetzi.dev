import { Schema } from "effect";
import { Cuid2Schema } from "../../../cuid2";
import { ComputeBinarySchema, ComputeTaskSchema } from "../../../compute/schemas";

export const CreateComputeUnitSchema = ComputeTaskSchema;
export const CreateComputeBinaryUnitSchema = ComputeBinarySchema;

export const RemoveComputeUnitSchema = Cuid2Schema;

export const NullableComputeUnitSchema = Schema.NullOr(ComputeTaskSchema);

export const ListComputeUnitsSchema = Schema.Array(ComputeTaskSchema);

export const GetComputeUnitByIdParamSchema = Schema.Struct({
  cuid: Cuid2Schema,
});
