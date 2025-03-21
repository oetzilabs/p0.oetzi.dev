import { Command, FileSystem, Path } from "@effect/platform";
import { cuid2 } from "@p0/core/src/cuid2";
import { BaseLoggerLive, BaseLoggerService } from "@p0/core/src/logger";
import { downloaded_file, get_safe_path } from "@p0/core/src/utils";
import { FileDownload } from "@p0/core/src/utils/schemas";
import { Config, Duration, Effect, pipe, Ref, Stream } from "effect";
import { Client, fetch as undici_fetch } from "undici";
import { FireCrackerDownloadFailed, FireCrackerFailedToBoot, FireCrackerVmNotCreated } from "./errors";
import {
  DriveSchema,
  VmConfigSchema,
  VmId,
  type Drive,
  type NetworkInterface,
  type Run,
  type VmConfig,
} from "./schema";
import { HttpModemLive, HttpModemService, type ModemOptions } from "./modem";

const makeDispatcher = (host: string, socketPath: string) =>
  new Client(host, {
    connect: {
      socketPath,
    },
  });

type SocketCurlRequest = {
  firecrackerSocketPath: string;
  method: string;
  url: string;
  body: unknown;
};

export class FirecrackerService extends Effect.Service<FirecrackerService>()("@p0/vm/firecracker/repo", {
  effect: Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);
    const base_modem = yield* _(HttpModemService);
    const modem_dialer = (options: Omit<ModemOptions, "connectionTimeout" | "timeout">) =>
      base_modem.build({
        connectionTimeout: 1000,
        timeout: 1000,
        socketPath: options.socketPath,
        headers: options.headers,
      }).dial;
    const base_logger = yield* _(BaseLoggerService);
    const logger = base_logger.withGroup("firecracker");
    const separator = process.platform === "win32" ? ";" : ":";
    const arch = process.arch === "x64" ? "x86_64" : "aarch64";

    const PathConfig = yield* Config.string("PATH").pipe(Config.withDefault(""));
    const PATH = PathConfig.split(separator)
      .filter((p) => !p.includes(" "))
      .join(separator);

    const env = Command.env({
      PATH,
    });
    yield* logger.info("composer", "Starting Firecracker composer");

    // helper functions
    const getMainVersion = <V extends keyof (typeof DOWNLOAD_LINKS)["x64"]>(version: V) => {
      const versionParts = version.split(".") as [string, string, string] | [string, string];
      if (versionParts.length === 3) {
        return `${versionParts[0]}.${versionParts[1]}` as V;
      }
      if (versionParts.length === 2) {
        return `${versionParts[0]}.${versionParts[1]}` as V;
      }
      return version;
    };
    const run_command = (com: Command.Command, area: string) =>
      Effect.gen(function* (_) {
        const _process = yield* pipe(
          Command.start(com),
          Effect.flatMap((_process) =>
            Effect.gen(function* (_) {
              const stdoutStream = _process.stdout.pipe(Stream.decodeText("utf8"));
              const stderrStream = _process.stderr.pipe(Stream.decodeText("utf8"));

              yield* stdoutStream.pipe(
                Stream.runForEach((line) => logger.info(area, line)),
                Effect.fork
              );

              // Accumulate output from stderr
              yield* stderrStream.pipe(
                Stream.runForEach((line) => logger.error(area, line)),
                Effect.fork
              );
              return _process;
            })
          )
        );
        return _process;
      });

    // Constants
    const DOWNLOAD_LINKS = {
      x64: {
        "v1.11": {
          os: "https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/v1.11/x86_64/ubuntu-24.04.squashfs",
        },
        "v1.10": {
          os: "https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/v1.10/x86_64/ubuntu-22.04.squashfs",
        },
      },
      aarch64: {
        "v1.11": {
          os: "https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/v1.11/aarch64/ubuntu-24.04.squashfs",
        },
        "v1.10": {
          os: "https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/v1.10/aarch64/ubuntu-22.04.squashfs",
        },
      },
    };

    const DEFAULT_VM_CONFIG_OPTIONS: {
      linux: string;
      resources: { cpu: number; memory: number };
      network_interfaces: NetworkInterface[];
    } = {
      linux: "6.1.102",
      resources: {
        cpu: 1,
        memory: 128,
      },
      network_interfaces: [],
    };
    const FIRECRACKER_SETUP_DIR = yield* Config.string("FIRECRACKER_SETUP_DIR").pipe(
      Config.withDefault("./firecracker-setup")
    );
    const FIRECRACKER_LINUX_VERSION = yield* Config.string("FIRECRACKER_LINUX_VERSION").pipe(
      Config.withDefault("6.1.102")
    );
    const FIRECRACKER_URL = "http://localhost";
    const FIRECRACKER_VERSION = yield* Config.string("FIRECRACKER_VERSION").pipe(Config.withDefault("v1.11"));
    const FIRECRACKER_MAIN_VERSION = getMainVersion(FIRECRACKER_VERSION as keyof (typeof DOWNLOAD_LINKS)["x64"]);
    const STARTING_DIRECTORY = yield* get_safe_path(FIRECRACKER_SETUP_DIR);
    const starting_dir_exists = yield* fs.exists(STARTING_DIRECTORY);
    if (!starting_dir_exists) {
      yield* fs.makeDirectory(STARTING_DIRECTORY, { recursive: true });
    }

    const VMS_SAFE_PATH = yield* get_safe_path("prepare");
    const vmsFolderExists = yield* fs.exists(VMS_SAFE_PATH);
    if (!vmsFolderExists) {
      yield* fs.makeDirectory(VMS_SAFE_PATH, { recursive: true });
    }

    const VM_LINUX_BINARY = yield* Effect.gen(function* (_) {
      //example: https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/v1.10/x86_64/vmlinux-6.1.102
      const LINUX_URL = `https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/${FIRECRACKER_MAIN_VERSION}/${arch}/vmlinux-${FIRECRACKER_LINUX_VERSION}`;
      const filename = path.basename(LINUX_URL);

      const linuxDir = path.join(STARTING_DIRECTORY, "vmlinux-collection");
      const linuxDirExists = yield* fs.exists(linuxDir);
      const destination = path.join(linuxDir, filename);

      if (!linuxDirExists) {
        yield* fs.makeDirectory(linuxDir, { recursive: true });
        yield* downloaded_file(
          FileDownload.make({
            filename,
            exists: false,
            from: new URL(LINUX_URL),
            to: destination,
          })
        );
      }

      return destination;
    });

    const ROOTFS_BINARY = yield* Effect.gen(function* (_) {
      const dl_arch = process.arch === "x64" ? "x64" : "aarch64";
      const dl = DOWNLOAD_LINKS[dl_arch][FIRECRACKER_MAIN_VERSION];

      const filename = path.basename(`${dl.os}.upstream`);
      let rootFsFile = FileDownload.make({
        from: new URL(dl.os),
        filename,
        to: path.join(STARTING_DIRECTORY, filename),
        exists: false,
      });
      yield* logger.info("downloadRootfs", `Checking if upstream file exists ${rootFsFile.to}`);
      const rootsFile_exists = yield* fs.exists(path.join(STARTING_DIRECTORY, filename));

      if (!rootsFile_exists) {
        yield* logger.info(
          "downloadRootfs",
          `Downloading rootfs for ${FIRECRACKER_LINUX_VERSION} ${FIRECRACKER_MAIN_VERSION}`
        );
        rootFsFile = yield* downloaded_file(rootFsFile);
      }

      const unsquashed_folder = `unsquashed-${path.basename(dl.os).replace(".squashfs", "")}`;
      yield* logger.info("downloadRootfs", `Checking for ${path.join(STARTING_DIRECTORY, unsquashed_folder)}`);
      const squashfs_root_exists = yield* fs.exists(path.join(STARTING_DIRECTORY, unsquashed_folder));
      if (!squashfs_root_exists) {
        yield* logger.info("downloadRootfs", `Unsquashing the ${filename} to ${unsquashed_folder}`);
        const unsquashfs_com = Command.make("unsquashfs", "-d", unsquashed_folder, rootFsFile.to).pipe(
          Command.workingDirectory(STARTING_DIRECTORY),
          env
        );
        const unsquashfs_process = yield* run_command(unsquashfs_com, "downloadRootfs");

        const unsquashfs_exit_code = yield* unsquashfs_process.exitCode;
        if (unsquashfs_exit_code !== 0) {
          return yield* Effect.fail(
            FireCrackerDownloadFailed.make({
              exitCode: unsquashfs_exit_code,
              message: "unsquashfs failed",
            })
          );
        }
      }

      const id_rsa_name = path.basename(dl.os).replace(".squashfs", ".id_rsa");
      const id_rsa_path = path.join(STARTING_DIRECTORY, unsquashed_folder, "root", ".ssh", id_rsa_name);
      const id_rsa_exists = yield* fs.exists(id_rsa_path);
      if (!id_rsa_exists) {
        yield* logger.error("downloadRootfs", "id_rsa does not exist, generating...");
        const ssh_keygen_com = Command.make("ssh-keygen", "-f", id_rsa_name, "-N", '""').pipe(
          Command.workingDirectory(path.join(STARTING_DIRECTORY, unsquashed_folder, "root", ".ssh")),
          env
        );

        const ssh_keygen_process = yield* run_command(ssh_keygen_com, "downloadRootfs");
        const ssh_keygen_exit_code = yield* ssh_keygen_process.exitCode;
        if (ssh_keygen_exit_code !== 0) {
          return yield* Effect.fail(
            FireCrackerDownloadFailed.make({
              exitCode: ssh_keygen_exit_code,
              message: "ssh_keygen failed",
            })
          );
        }
        // cp id_rsa.pub authorized_keys
        const cp_com = Command.make("cp", `${id_rsa_name}.pub`, "authorized_keys").pipe(
          Command.workingDirectory(path.join(STARTING_DIRECTORY, unsquashed_folder, "root", ".ssh")),
          env
        );
        const cp_process = yield* run_command(cp_com, "downloadRootfs");
        const cp_exit_code = yield* cp_process.exitCode;
        if (cp_exit_code !== 0) {
          return yield* Effect.fail(
            FireCrackerDownloadFailed.make({
              exitCode: cp_exit_code,
              message: "cp failed",
            })
          );
        }

        // sudo chown -R root:root unsquashed_folder
        const chown_com = Command.make(
          "sudo",
          "chown",
          "-R",
          "root:root",
          path.join(STARTING_DIRECTORY, unsquashed_folder)
        ).pipe(Command.workingDirectory(STARTING_DIRECTORY), env);
        const chown_process = yield* run_command(chown_com, "downloadRootfs");
        const chown_exit_code = yield* chown_process.exitCode;
        if (chown_exit_code !== 0) {
          return yield* Effect.fail(
            FireCrackerDownloadFailed.make({
              exitCode: chown_exit_code,
              message: "chown failed",
            })
          );
        }

        const truncate_com = Command.make(
          "truncate",
          "-s",
          "400M",
          path.basename(dl.os).replace(".squashfs", ".ext4")
        ).pipe(Command.workingDirectory(STARTING_DIRECTORY), env);

        const truncate_process = yield* run_command(truncate_com, "downloadRootfs");
        const truncate_exit_code = yield* truncate_process.exitCode;
        if (truncate_exit_code !== 0) {
          return yield* Effect.fail(
            FireCrackerDownloadFailed.make({
              exitCode: truncate_exit_code,
              message: "truncation failed",
            })
          );
        }

        const mkfs_ext4_com = Command.make(
          "mkfs.ext4",
          "-d",
          path.join(STARTING_DIRECTORY, unsquashed_folder),
          "-F",
          path.basename(dl.os).replace(".squashfs", ".ext4")
        ).pipe(Command.workingDirectory(STARTING_DIRECTORY), env);

        const mkfs_ext4_process = yield* run_command(mkfs_ext4_com, "downloadRootfs");
        const mkfs_ext4_exit_code = yield* mkfs_ext4_process.exitCode;
        if (mkfs_ext4_exit_code !== 0) {
          return yield* Effect.fail(
            FireCrackerDownloadFailed.make({
              exitCode: truncate_exit_code,
              message: "mkfs.ext4 failed",
            })
          );
        }
      }

      return path.join(STARTING_DIRECTORY, path.basename(dl.os).replace(".squashfs", ".ext4"));
    });

    const FIRECRACKER_BINARY = yield* Effect.gen(function* (_) {
      const arch = process.arch === "x64" ? "x86_64" : "aarch64";

      const filename = `firecracker-${FIRECRACKER_VERSION}-${arch}.tgz`;
      const releaseURL = new URL(
        `https://github.com/firecracker-microvm/firecracker/releases/download/${FIRECRACKER_VERSION}/${filename}`
      );
      const downloadPath = path.join(STARTING_DIRECTORY, filename);

      const fc_d = FileDownload.make({
        from: releaseURL,
        filename: filename,
        to: downloadPath,
        exists: false,
      });

      const firecracker_file_exists = yield* fs.exists(downloadPath);
      if (!firecracker_file_exists) {
        yield* downloaded_file(fc_d);

        yield* logger.info("FIRECRACKER_BINARY", `Untaring the ${downloadPath}`);

        // untar the downloaded file
        const untar_com = Command.make("tar", "-xzf", downloadPath).pipe(
          Command.workingDirectory(STARTING_DIRECTORY),
          env
        );

        const untar_process = yield* run_command(untar_com, "FIRECRACKER_BINARY");
        const untar_exit_code = yield* untar_process.exitCode;
        if (untar_exit_code !== 0) {
          return yield* Effect.fail(
            FireCrackerDownloadFailed.make({
              exitCode: untar_exit_code,
              message: "untar failed",
            })
          );
        }
        yield* logger.info("FIRECRACKER_BINARY", `Done untarting the ${downloadPath}`);
      }

      return path.join(
        STARTING_DIRECTORY,
        `release-${FIRECRACKER_VERSION}-${arch}/firecracker-${FIRECRACKER_VERSION}-${arch}`
      );
    });

    // Refs
    const vmCollection = yield* Ref.make(new Map<string, Effect.Effect<void, any, any>>());

    const close = (firecrackerSocketPath: string) =>
      Effect.gen(function* (_) {
        // if the socket is being used, kill the process
        const killProcess = yield* run_command(Command.make("fuser", "-k", firecrackerSocketPath), "close");
        const killExitCode = yield* killProcess.exitCode;
        if (killExitCode !== 0) {
          return yield* Effect.fail(
            FireCrackerFailedToBoot.make({
              path: firecrackerSocketPath,
              message: "Failed to kill fuser process",
            })
          );
        }
        yield* fs.remove(firecrackerSocketPath, { force: true });
      });

    const createFirecrackerVM = (config: VmConfig) =>
      Effect.gen(function* (_) {
        const vmSocketPath = `/tmp/firecracker-${config.vmId}.sock`;
        const firecrackerCommand = Command.make(FIRECRACKER_BINARY, "--api-sock", vmSocketPath).pipe(
          Command.runInShell(true),
          env
        );

        // run in the background
        yield* run_command(firecrackerCommand, "createFirecrackerVM").pipe(Effect.fork);

        yield* Effect.sleep(Duration.millis(500));

        // does the socket path exist?
        const vmSocketPathExists = yield* fs.exists(vmSocketPath);
        if (!vmSocketPathExists) {
          return yield* Effect.fail(
            FireCrackerVmNotCreated.make({
              message: `Failed to create VM: SocketPath '${vmSocketPath}' does not exist`,
            })
          );
        }

        yield* Ref.update(vmCollection, (map) => {
          map.set(
            config.vmId,
            Effect.gen(function* () {
              yield* close(vmSocketPath);
            })
          );
          return map;
        });

        const waitingTimeBetweenCommands = Duration.millis(500);

        // first boot-source
        yield* logger.info("createFirecrackerVM", "boot-source", JSON.stringify(config.boot_source));
        yield* socket_curl_request({
          firecrackerSocketPath: vmSocketPath,
          method: "PUT",
          url: `${FIRECRACKER_URL}/boot-source`,
          body: config.boot_source,
        });
        yield* logger.info("createFirecrackerVM", "boot-source has been set");
        yield* Effect.sleep(waitingTimeBetweenCommands);

        // then drives
        yield* logger.info("createFirecrackerVM", "drives", JSON.stringify(config.drives));
        for (const drive of config.drives) {
          yield* socket_curl_request({
            firecrackerSocketPath: vmSocketPath,
            method: "PUT",
            url: `${FIRECRACKER_URL}/drives/${drive.drive_id}`,
            body: drive,
          });
        }
        yield* logger.info("createFirecrackerVM", "drives have been set");
        yield* Effect.sleep(waitingTimeBetweenCommands);

        // // then network-interfaces
        // yield* logger.info("createFirecrackerVM", "network-interfaces", JSON.stringify(config.network_interfaces));
        // const networkInterfacesResponse = yield* socket_fetch(
        //   "PUT",
        //   `${FIRECRACKER_URL}/network-interfaces`,
        //   config.network_interfaces,
        //   dispatcher
        // );

        // if (networkInterfacesResponse.status !== 204) {
        //   return yield* Effect.fail(FireCrackerVmNotCreated.make({ message: "Failed to create VM" }));
        // }
        // yield* logger.info("createFirecrackerVM", "network-interfaces have been set");

        // then machine-config
        yield* logger.info("createFirecrackerVM", "machine-config", JSON.stringify(config.machine_config));
        yield* socket_curl_request({
          firecrackerSocketPath: vmSocketPath,
          method: "PUT",
          url: `${FIRECRACKER_URL}/machine-config`,
          body: config.machine_config,
        });
        yield* logger.info("createFirecrackerVM", "machine-config has been set");
        yield* Effect.sleep(waitingTimeBetweenCommands);

        yield* socket_curl_request({
          firecrackerSocketPath: vmSocketPath,
          method: "PUT",
          url: `${FIRECRACKER_URL}/actions`,
          body: {
            action_type: "InstanceStart",
          },
        });
        yield* logger.info("createFirecrackerVM", "InstanceStart has been set");
        yield* Effect.sleep(waitingTimeBetweenCommands);

        // return the vmId
        return config.vmId;
      });

    const socket_curl_request = (scr: SocketCurlRequest) =>
      Effect.gen(function* (_) {
        const dialer = modem_dialer({ socketPath: scr.firecrackerSocketPath });
        return yield* dialer({
          path: scr.url,
          method: scr.method,
          data: JSON.stringify(scr.body),
          statusCodes: {
            204: true,
            400: "BadRequest",
          },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });
      });

    const socket_fetch = (
      method: NonNullable<NonNullable<Parameters<typeof undici_fetch>[1]>["method"]>,
      url: string,
      body: unknown,
      dispatcher: Client
    ) =>
      Effect.tryPromise((signal) =>
        undici_fetch(url, {
          method,
          dispatcher,
          body: JSON.stringify(body),
          signal,
        })
      );

    const startFirecrackerVM = (vmId: VmId) =>
      Effect.gen(function* (_) {
        const vmSocketPath = yield* get_safe_path(`/tmp/firecracker-${vmId.toString()}.sock`);

        // unix-socket send action
        const response = yield* socket_curl_request({
          firecrackerSocketPath: vmSocketPath,
          method: "PUT",
          url: `${FIRECRACKER_URL}/actions`,
          body: {
            action_type: "InstanceStart",
          },
        });

        return response;
      });

    const createVmConfiguration = (config: typeof DEFAULT_VM_CONFIG_OPTIONS) =>
      Effect.gen(function* (_) {
        const mergedConfig = { ...DEFAULT_VM_CONFIG_OPTIONS, ...config };

        const host_drives = yield* getHostDrives().pipe(
          Effect.catchTags({
            SystemError: () => Effect.succeed([] as Drive[]),
            BadArgument: () => Effect.succeed([] as Drive[]),
          })
        );

        return VmConfigSchema.make({
          vmId: VmId.make(cuid2()),
          boot_source: {
            kernel_image_path: VM_LINUX_BINARY,
            boot_args: "console=ttyS0 noapic reboot=k panic=1 pci=off nomodules",
          },
          drives: [
            {
              drive_id: "rootfs",
              path_on_host: ROOTFS_BINARY,
              is_read_only: false,
              is_root_device: true,
            },
            ...host_drives,
          ],
          network_interfaces: [...mergedConfig.network_interfaces],
          machine_config: {
            vcpu_count: mergedConfig.resources?.cpu || 1,
            mem_size_mib: mergedConfig.resources?.memory || 128,
          },
        });
      });

    const destroyFirecrackerVM = (vmId: VmId) =>
      Effect.gen(function* (_) {
        const vmSocketPath = yield* get_safe_path(`/tmp/firecracker-${vmId.toString()}.sock`);
        const dispatcher = makeDispatcher(FIRECRACKER_URL, vmSocketPath);
        const response = yield* socket_fetch(
          "PUT",
          `${FIRECRACKER_URL}/actions`,
          {
            action_type: "SendCtrlAltDel",
          },
          dispatcher
        );

        if (response.status !== 204) {
          return yield* Effect.fail(FireCrackerVmNotCreated.make({ message: "Failed to destroy VM" }));
        }

        return yield* Effect.promise(() => response.text());
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
              return DriveSchema.make({
                drive_id: d,
                is_read_only,
                is_root_device,
                path_on_host: `/dev/disk/by-id/${d}`,
              });
            })
          )
        );
        return drives;
      });

    const run = (run: Run) =>
      Effect.gen(function* (_) {
        yield* logger.info("run", "starting run");
        const mergedConfig = {
          ...DEFAULT_VM_CONFIG_OPTIONS,
          ...run.config,
          persistent: run.config.persistent ?? false,
        };

        yield* logger.info("run", "creating vm configuration");
        const vmConfig = yield* createVmConfiguration(mergedConfig);

        yield* logger.info("run", "creating firecracker vm");
        const firecracker_vm = yield* createFirecrackerVM(vmConfig);

        yield* logger.info("run", "starting firecracker vm");
        yield* startFirecrackerVM(firecracker_vm);

        // const executionResult = yield* executeCodeInVM(vmId, language, config.timeout || 10);

        if (!mergedConfig.persistent) {
          yield* logger.info("run", "destroying firecracker vm");
          yield* destroyFirecrackerVM(firecracker_vm);
        }

        // return executionResult;
        return yield* Effect.void;
      });

    return { run, close } as const;
  }),
  dependencies: [BaseLoggerLive, HttpModemLive],
}) {}

export const FirecrackerLive = FirecrackerService.Default;
