import { Schema } from "effect";

export class VirtualMachineNotFound extends Schema.TaggedError<VirtualMachineNotFound>()(
  "VirtualMachineNotFound",
  {}
) {}
export class VirtualMachineAlreadyExists extends Schema.TaggedError<VirtualMachineAlreadyExists>()(
  "VirtualMachineAlreadyExists",
  {}
) {}
export class VirtualMachineDeleted extends Schema.TaggedError<VirtualMachineDeleted>()("VirtualMachineDeleted", {}) {}
export class VirtualMachineNotDeleted extends Schema.TaggedError<VirtualMachineNotDeleted>()(
  "VirtualMachineNotDeleted",
  {}
) {}
export class VirtualMachineNotUpdated extends Schema.TaggedError<VirtualMachineNotUpdated>()(
  "VirtualMachineNotUpdated",
  {}
) {}
export class VirtualMachineNotCreated extends Schema.TaggedError<VirtualMachineNotCreated>()(
  "VirtualMachineNotCreated",
  {}
) {}
export class VirtualMachineAlreadyDeleted extends Schema.TaggedError<VirtualMachineAlreadyDeleted>()(
  "VirtualMachineAlreadyDeleted",
  {}
) {}

export class BootSourceNotFound extends Schema.TaggedError<BootSourceNotFound>()("BootSourceNotFound", {}) {}

export class MachineConfigNotFound extends Schema.TaggedError<MachineConfigNotFound>()("MachineConfigNotFound", {}) {}
