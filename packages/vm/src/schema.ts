import { Schema } from "effect";

export const DriveSchema = Schema.Struct({
  drive_id: Schema.String,
  path_on_host: Schema.String,
  is_read_only: Schema.Boolean,
  is_root_device: Schema.Boolean,
});

export type Drive = Schema.Schema.Type<typeof DriveSchema>;

export const NetworkInterfaceSchema = Schema.Struct({
  iface_id: Schema.String,
  guest_mac: Schema.String,
  host_dev_name: Schema.String,
});

export type NetworkInterface = Schema.Schema.Type<typeof NetworkInterfaceSchema>;

export const MachineConfigSchema = Schema.Struct({
  vcpu_count: Schema.Number,
  mem_size_mib: Schema.Number,
});

export type MachineConfig = Schema.Schema.Type<typeof MachineConfigSchema>;

export const BootSourceSchema = Schema.Struct({
  kernel_image_path: Schema.String,
  initrd_path: Schema.optional(Schema.String),
  boot_args: Schema.optional(Schema.String),
});

export type BootSource = Schema.Schema.Type<typeof BootSourceSchema>;

export const VmId = Schema.String.pipe(Schema.brand("VmId"));
export type VmId = typeof VmId.Type;

export const VmConfigSchema = Schema.Struct({
  vmId: VmId,
  jailed: Schema.Boolean,
  boot_source: BootSourceSchema,
  drives: Schema.mutable(Schema.Array(DriveSchema)),
  network_interfaces: Schema.mutable(Schema.Array(NetworkInterfaceSchema)),
  machine_config: MachineConfigSchema,
});

export type VmConfig = Schema.Schema.Type<typeof VmConfigSchema>;

export const StorageSchema = Schema.Struct({});
export type Storage = Schema.Schema.Type<typeof StorageSchema>;

export const LoggingSchema = Schema.Struct({});
export type Logging = Schema.Schema.Type<typeof LoggingSchema>;

export const MonitoringSchema = Schema.Struct({});
export type Monitoring = Schema.Schema.Type<typeof MonitoringSchema>;

export const KeyValueSchema = Schema.Struct({});
export type KeyValue = Schema.Schema.Type<typeof KeyValueSchema>;

export const ModulesSchema = Schema.Struct({
  network: Schema.optional(Schema.Union(Schema.Boolean, NetworkInterfaceSchema)),
  storage: Schema.optional(Schema.Union(Schema.Boolean, StorageSchema)),
  logging: Schema.optional(Schema.Union(Schema.Boolean, LoggingSchema)),
  monitoring: Schema.optional(Schema.Union(Schema.Boolean, MonitoringSchema)),
  kv: Schema.optional(Schema.Union(Schema.Boolean, KeyValueSchema)),
});

export const ResourceSchema = Schema.Struct({
  cpu: Schema.Number,
  memory: Schema.Number,
});

export const BaseConfigSchema = Schema.Struct({
  type: Schema.optional(Schema.Literal("worker", "jailed_vm", "vm")),
  timeout: Schema.optional(Schema.Duration),
  persistent: Schema.optional(Schema.Boolean),
  modules: Schema.optional(ModulesSchema),
  resources: Schema.optional(ResourceSchema),
});

const ZipSchema = Schema.instanceOf(File);

export const NodeJsRunSchema = Schema.Struct({
  zip: ZipSchema,
  environment: Schema.Literal("nodejs22", "nodejs20"), // ! we will not go beyond nodejs 20, LTS is important !
  config: Schema.optional(
    Schema.Struct({
      ...BaseConfigSchema.fields,
    })
  ),
});

export const BunJsRunSchema = Schema.Struct({
  zip: ZipSchema,
  environment: Schema.Literal("bun"), // ! Always the latest version
  config: Schema.optional(
    Schema.Struct({
      ...BaseConfigSchema.fields,
    })
  ),
});

export const GoRunSchema = Schema.Struct({
  zip: ZipSchema,
  environment: Schema.Literal("nodejs22", "nodejs20"),
  config: Schema.optional(
    Schema.Struct({
      ...BaseConfigSchema.fields,
    })
  ),
});

export type NodeJsRun = Schema.Schema.Type<typeof NodeJsRunSchema>;
export type BunJsRun = Schema.Schema.Type<typeof BunJsRunSchema>;

export const RunSchema = Schema.Union(NodeJsRunSchema, BunJsRunSchema, GoRunSchema);
export type Run = Schema.Schema.Type<typeof RunSchema>;

const BaseVmExecutionResultSchema = Schema.Struct({
  // config: VmConfigSchema,
  duration: Schema.Number,
});

export const VmExecutionResultSchema = Schema.Union(
  Schema.Struct({
    ...BaseVmExecutionResultSchema.fields,
    success: Schema.Literal(true),
    data: Schema.Any,
  }),
  Schema.Struct({
    ...BaseVmExecutionResultSchema.fields,
    success: Schema.Literal(false),
    errors: Schema.Array(Schema.String),
  })
);

export type VmExecutionResult = Schema.Schema.Type<typeof VmExecutionResultSchema>;

export const createVmExecutionResult = (data: VmExecutionResult): VmExecutionResult => data;
