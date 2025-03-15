import { Command, FetchHttpClient, FileSystem, HttpBody, HttpClientRequest, Path } from "@effect/platform";
import { BunContext, BunFileSystem } from "@effect/platform-bun";
import { downloaded_file, fetch, get_safe_path } from "@p0/core/src/utils";
import { FileDownload } from "@p0/core/src/utils/schemas";
import { env } from "bun";
import { Config, Effect, pipe, Schema } from "effect";
import {
  FireCrackerDownloadFailed,
  FireCrackerFailedToBoot,
  FireCrackerFailedToMakeExecutable,
  FireCrackerVmNotCreated,
  UnsupportedArchitecture,
} from "./errors";
import { setup } from "./images";
import { VmConfigSchema, VmId, VolumeSchema, type VmConfig, type Volume } from "./schema";

const FIRECRACKER_URL = "http://localhost:8080";

const DEFAULT_VM_CONFIG_OPTIONS: {
  resources: { cpu: number; memory: number };
  volumes: Volume[];
} = {
  resources: {
    cpu: 1,
    memory: 128,
  },
  volumes: [],
};

const createFirecrackerVM = (config: VmConfig) =>
  Effect.gen(function* (_) {
    const body = yield* HttpBody.json(config);
    const request = HttpClientRequest.make("PUT")(`${FIRECRACKER_URL}/vms`, {
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });
    const response = yield* fetch(request)
      .pipe(Effect.map((data: any) => ({ vm_id: VmId.make(data.vm_id) })))
      .pipe(
        Effect.catchTags({
          ResponseError: (e) => Effect.fail(FireCrackerVmNotCreated.make({ cause: e })),
        })
      );
    return response;
  });

const destroyFirecrackerVM = (vmId: VmId) =>
  Effect.gen(function* (_) {
    const request = HttpClientRequest.make("DELETE")(`${FIRECRACKER_URL}/vms/${vmId}`);
    return fetch(request);
  });

const startFirecrackerVM = (vmId: string) =>
  Effect.gen(function* (_) {
    const body = yield* HttpBody.json({ action_type: "InstanceStart" });
    const request = HttpClientRequest.make("PUT")(`${FIRECRACKER_URL}/vms/${vmId}/actions`, {
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    return fetch(request);
  });

const getHostDrives = () =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const _drives = yield* fs.readDirectory("/dev/disk/by-id");
    const drives = yield* Effect.all(
      _drives.map((d) =>
        Effect.gen(function* (_) {
          const is_read_only = ((yield* fs.stat(d)).mode & 0o444) === 0o444;
          const is_root_device = ((yield* fs.stat(d)).mode & 0o4000) === 0o4000;
          return { drive_id: d, is_read_only, is_root_device, path_on_host: `/dev/disk/by-id/${d}` };
        })
      )
    );
    return drives;
  });

const createVmConfiguration = (config: typeof DEFAULT_VM_CONFIG_OPTIONS) =>
  Effect.gen(function* (_) {
    const mergedConfig = { ...DEFAULT_VM_CONFIG_OPTIONS, ...config };

    const host_drives = yield* getHostDrives();

    return VmConfigSchema.make({
      boot_source: {
        kernel_image_path: "/path/to/your/kernel",
        boot_args: "console=ttyS0 noapic reboot=k panic=1 pci=off nomodules",
      },
      drives: [
        {
          drive_id: "rootfs",
          path_on_host: "/path/to/your/rootfs.ext4",
          is_read_only: false,
          is_root_device: true,
        },
        ...host_drives,
      ],
      network_interfaces: [
        {
          iface_id: "eth0",
          guest_mac: "AA:BB:CC:DD:EE:FF",
          host_dev_name: "tap0",
        },
      ],
      machine_config: {
        vcpu_count: mergedConfig.resources?.cpu || 1,
        mem_size_mib: mergedConfig.resources?.memory || 128,
      },
      volumes: mergedConfig.volumes ?? [],
    });
  });

const RunSchema = Schema.Struct({
  code: Schema.String,
  language: Schema.String,
  config: Schema.Struct({
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

type Run = Schema.Schema.Type<typeof RunSchema>;

/**
 * Prepare the VM environment
 * This function is responsible for checking if the VM files and binaries are present and running.
 * It will be called before the run function.
 *
 */
export const prepare = (version: string = "v1.10.1") =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);
    const FIRECRACKER_PORT = yield* _(Config.number("FIRECRACKER_PORT").pipe(Config.withDefault(28888)));

    // using firecracker-vm from github: https://github.com/firecracker-microvm/firecracker

    const arch = process.arch;
    let filename: string;
    if (arch === "x64") {
      filename = `firecracker-${version}-x86_64.tgz`;
    } else if (arch === "arm64") {
      filename = `firecracker-${version}-aarch64.tgz`;
    } else {
      return yield* _(Effect.fail(UnsupportedArchitecture.make({ arch })));
    }

    const safe_path = yield* get_safe_path(filename);
    const safe_path_dir = path.dirname(safe_path);
    const firecracker_folder = path.join(safe_path_dir, "firecracker");
    const executable = path.join(
      firecracker_folder,
      filename.replace(".tgz", "").replace("firecracker-", "release-"),
      filename.replace(".tgz", "")
    );
    const executable_exists = yield* fs.exists(executable);
    const firecracker_folder_exists = yield* fs.exists(firecracker_folder);
    if (!firecracker_folder_exists) {
      yield* fs.makeDirectory(firecracker_folder, { recursive: true });
    }

    // check if the safe_path directory exists
    const safe_path_exists = yield* fs.exists(safe_path_dir);
    if (!safe_path_exists) {
      yield* fs.makeDirectory(safe_path_dir, { recursive: true });
    }

    const firecracker_microvm_file_download = FileDownload.make({
      filename,
      exists: firecracker_folder_exists,
      from: new URL(`https://github.com/firecracker-microvm/firecracker/releases/download/${version}/${filename}`),
      to: safe_path,
    });

    const firecracker_vm = yield* downloaded_file(firecracker_microvm_file_download);

    if (!firecracker_vm.exists) {
      return yield* Effect.fail(
        FireCrackerDownloadFailed.make({ exitCode: 1, message: "Firecracker download failed" })
      );
    }

    if (!executable_exists) {
      const exitCode = yield* pipe(
        Command.make("tar", "-xf", firecracker_vm.to, "-C", firecracker_folder).pipe(Command.exitCode),
        Effect.catchTags({
          // BadArgument: (e) => Effect.fail(FireCrackerDownloadFailed.make({ exitCode, message: e.message })),
          // SystemError: (e) => Effect.fail(FireCrackerDownloadFailed.make({ exitCode, message: e.message })),
        })
      );

      if (exitCode !== 0) {
        return yield* Effect.fail(FireCrackerDownloadFailed.make({ exitCode, message: "tar -xf failed" }));
      }
    }

    const chmod_exitCode = yield* Command.make("chmod", "+x", executable).pipe(Command.exitCode);

    if (chmod_exitCode !== 0) {
      return yield* Effect.fail(FireCrackerFailedToMakeExecutable.make({ path: executable }));
    }

    const { kernelPath, rootfsPath } = yield* setup();

    const boot_exitCode = yield* pipe(
      Command.make(
        executable,
        `--socket-path /tmp/firecracker.sock --port ${FIRECRACKER_PORT} --kernel ${kernelPath} --rootfs ${rootfsPath}`
      ),
      Command.exitCode
    );

    if (boot_exitCode !== 0) {
      return yield* Effect.fail(FireCrackerFailedToBoot.make({ path: executable }));
    }

    return executable;
  }).pipe(Effect.scoped, Effect.provide(BunFileSystem.layer), Effect.provide(BunContext.layer));

export const run = (run: Run) =>
  Effect.gen(function* (_) {
    // 1. Create VM config (adjust based on 'config')
    const mergedConfig = { ...DEFAULT_VM_CONFIG_OPTIONS, ...run.config, persistent: run.config.persistent ?? false };
    const vmConfig = yield* createVmConfiguration(mergedConfig);

    // 2. Launch VM
    const firecracker = yield* createFirecrackerVM(vmConfig);

    // 2.5 Start the vm
    yield* startFirecrackerVM(firecracker.vm_id);

    // 3. Transfer code to VM
    // yield* transferCodeToVM(vmId, code, language);

    // 4. Execute code
    // const executionResult = yield* executeCodeInVM(vmId, language, config.timeout || 10);

    // 5. Handle persistence (if needed)
    if (!mergedConfig.persistent) {
      yield* destroyFirecrackerVM(firecracker.vm_id);
    }

    // return executionResult;
    return yield* Effect.void;
  }).pipe(
    Effect.scoped,
    Effect.provide(BunFileSystem.layer),
    Effect.provide(FetchHttpClient.layer),
    Effect.provide(BunContext.layer)
  );
