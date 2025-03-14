import { Command, FetchHttpClient, FileSystem, HttpBody, HttpClient, HttpClientRequest, Path } from "@effect/platform";
import { BunContext, BunFileSystem } from "@effect/platform-bun";
import { env } from "bun";
import { Chunk, Config, Effect, pipe, Schema, Stream } from "effect";
import {
  FireCrackerDownloadFailed,
  FireCrackerFailedToBoot,
  FireCrackerFailedToMakeExecutable,
  FireCrackerVmNotCreated,
  UnsupportedArchitecture,
} from "./errors";
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

const fetch = (request: HttpClientRequest.HttpClientRequest) =>
  Effect.gen(function* (_) {
    const client = yield* _(HttpClient.HttpClient);
    const response = yield* client.execute(request);
    return response;
  });

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

const get_safe_path = (filepath: string) =>
  Effect.gen(function* (_) {
    const path = yield* _(Path.Path);
    // get home directory
    const homeDir = env.HOME || env.USERPROFILE || "/tmp"; // Fallback to /tmp
    return path.join(homeDir, ".p0", "vms", filepath);
  });

const streamToArray = <T>(stream: Stream.Stream<T>) =>
  Effect.gen(function* (_) {
    return yield* Stream.runCollect(stream).pipe(Effect.map(Chunk.toArray));
  });

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

    const download_url = `https://github.com/firecracker-microvm/firecracker/releases/download/${version}/${filename}`;

    const safe_path = yield* get_safe_path(filename);
    const exists = yield* fs.exists(safe_path);
    const file_to_download = { filename, exists, from: download_url, to: safe_path };

    // Check if all files exist
    const downloaded_file = yield* Effect.gen(function* (_) {
      const request = HttpClientRequest.make("GET")(file_to_download.from);
      const response = yield* fetch(request).pipe(
        Effect.catchTag("ResponseError", () => Effect.succeed({ stream: Stream.make(new Uint8Array()) })),
        Effect.catchTag("RequestError", () => Effect.succeed({ stream: Stream.make(new Uint8Array()) }))
      ) as Effect.Effect<{ stream: Stream.Stream<Uint8Array<ArrayBuffer>, never, never> }, never, never>;
      const stream = response.stream;
      const bytes = yield* streamToArray(stream);
      const concatted = new Uint8Array(bytes.reduce((acc, curr) => acc + curr.length, 0));
      for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        if (!byte) continue;
        concatted.set(byte, i * byte.length);
      }
      yield* fs.writeFile(file_to_download.to, concatted);
      return yield* Effect.succeed(file_to_download);
    }).pipe(Effect.catchAll(() => Effect.succeed({ ...file_to_download, exists: false })));

    if (!downloaded_file.exists) {
      return yield* Effect.fail(FireCrackerDownloadFailed.make({ exitCode: 1 }));
    }

    const firecracker_folder = downloaded_file.to.replace(".tgz", "");

    // extract the files
    const exitCode = yield* pipe(
      Command.make("tar", `-xf ${downloaded_file.to} -C ${firecracker_folder}`),
      Command.exitCode
    );

    if (exitCode !== 0) {
      return yield* Effect.fail(FireCrackerDownloadFailed.make({ exitCode }));
    }
    const executable = path.join(firecracker_folder, "firecracker");
    // make the file executable
    const chmod_exitCode = yield* pipe(Command.make("chmod", `+x ${executable}`), Command.exitCode);

    if (chmod_exitCode !== 0) {
      return yield* Effect.fail(FireCrackerFailedToMakeExecutable.make({ path: downloaded_file.to }));
    }

    // boot the firecracker binary
    const firecracker_port = yield* Config.number("FIRECRACKER_PORT").pipe(Config.withDefault(28888));
    const boot_exitCode = yield* pipe(
      Command.make(executable, `--socket-path /tmp/firecracker.sock --port ${firecracker_port}`),
      Command.exitCode
    );

    if (boot_exitCode !== 0) {
      return yield* Effect.fail(FireCrackerFailedToBoot.make({ path: downloaded_file.to }));
    }

    return executable;
  }).pipe(
    Effect.scoped,
    Effect.provide(BunFileSystem.layer),
    Effect.provide(FetchHttpClient.layer),
    Effect.provide(BunContext.layer)
  );

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
