import { Schema } from "effect";
import { VmConfigSchema, VmTypeSchema } from "@p0/vm/src/firecracker/schema";
import { VirtualMachineCreateSchema, type VirtualMachineCreate } from "@p0/core/src/db/schema";

const VirtualMachineStatusSchema = Schema.Literal(
  "idle",
  "stopped",
  "starting",
  "stopping",
  "backing_up", // snapshot
  "restoring", // recovery from snapshot
  "unknown"
);

export const CreateVirtualMachineSchema = Schema.Struct({
  server_id: Schema.String,
  type: VmTypeSchema,
  image: Schema.String,
});

export type CreateVirtualMachine = Schema.Schema.Type<typeof CreateVirtualMachineSchema>;

export const CreateVirtualMachineConfigSchema = Schema.Struct({
  bootSourceFile: Schema.NullOr(Schema.instanceOf(File)),
  mem_size_mib: Schema.Number,
  vcpu_count: Schema.Number,
  server_id: Schema.String,
  jailed: Schema.Boolean,
  type: VmTypeSchema,
});

export type CreateVirtualMachineConfig = Schema.Schema.Type<typeof CreateVirtualMachineConfigSchema>;

export const RemoveVirtualMachineSchema = Schema.String;
export type RemoveVirtualMachine = Schema.Schema.Type<typeof RemoveVirtualMachineSchema>;

export const VirtualMachineSchema = VmConfigSchema;

export type VirtualMachine = Schema.Schema.Type<typeof VirtualMachineSchema>;

export const NullableVirtualMachineSchema = Schema.NullOr(VirtualMachineSchema);
export const UndefinableVirtualMachineSchema = Schema.UndefinedOr(VirtualMachineSchema);

export const ListVirtualMachinesSchema = Schema.Array(VirtualMachineSchema);

export const GetVirtualMachineByIdParamSchema = Schema.Struct({
  sid: Schema.String,
});

export const FindVirtualMachineByNameSchema = Schema.String;
