import { Schema } from "effect";

export const VolumeSchema = Schema.Struct({
  volume_id: Schema.String,
  path_on_host: Schema.String,
  is_root_device: Schema.Boolean,
});

export type Volume = Schema.Schema.Type<typeof VolumeSchema>;

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
  boot_args: Schema.String,
});

export type BootSource = Schema.Schema.Type<typeof BootSourceSchema>;

export const VmConfigSchema = Schema.Struct({
  boot_source: BootSourceSchema,
  drives: Schema.mutable(Schema.Array(DriveSchema)),
  network_interfaces: Schema.mutable(Schema.Array(NetworkInterfaceSchema)),
  machine_config: MachineConfigSchema,
  volumes: Schema.mutable(Schema.Array(VolumeSchema)),
});

export type VmConfig = Schema.Schema.Type<typeof VmConfigSchema>;

export const VmId = Schema.String.pipe(Schema.brand("VmId"));
export type VmId = typeof VmId.Type;

export const RunSchema = Schema.Struct({
  code: Schema.String,
  language: Schema.String,
  config: Schema.Struct({
    os: Schema.Union(Schema.Literal("ubuntu-24.04.ext4")),
    timeout: Schema.optional(Schema.Number),
    persistent: Schema.optional(Schema.Boolean),
    volumes: Schema.optional(Schema.mutable(Schema.Array(VolumeSchema))),
    dependencies: Schema.optional(Schema.Array(Schema.String)),
    resources: Schema.optional(
      Schema.Struct({
        cpu: Schema.Number,
        memory: Schema.Number,
      })
    ),
  }),
});

export type Run = Schema.Schema.Type<typeof RunSchema>;
