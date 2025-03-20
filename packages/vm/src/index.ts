import { Command, FileSystem, Path } from "@effect/platform";
import { cuid2 } from "@p0/core/src/cuid2";
import { BaseLoggerLive, BaseLoggerService } from "@p0/core/src/logger";
import { downloaded_file, get_safe_path, run_command, run_command_withLogger } from "@p0/core/src/utils";
import { FileDownload } from "@p0/core/src/utils/schemas";
import { Config, Effect, Ref } from "effect";
import { Agent, fetch as undici_fetch } from "undici";
import {
  FireCrackerDownloadFailed,
  FireCrackerFailedToBoot,
  FireCrackerFailedToStartVM,
  FireCrackerVmNotCreated,
} from "./errors";
import {
  DriveSchema,
  VmConfigSchema,
  VmId,
  type Drive,
  type NetworkInterface,
  type Run,
  type VmConfig,
  type Volume,
} from "./schema";

export class FirecrackerService extends Effect.Service<FirecrackerService>()("@p0/vm/firecracker/repo", {
  effect: Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);
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
    } as const;

    const DEFAULT_VM_CONFIG_OPTIONS: {
      linux: string;
      resources: { cpu: number; memory: number };
      volumes: Volume[];
      network_interfaces: NetworkInterface[];
    } = {
      linux: "6.1.102",
      resources: {
        cpu: 1,
        memory: 128,
      },
      volumes: [],
      network_interfaces: [],
    };
    const FIRECRACKER_PORT = yield* _(Config.number("FIRECRACKER_PORT").pipe(Config.withDefault(28888)));
    const FIRECRACKER_URL = `http://localhost:${FIRECRACKER_PORT}`;
    const FIRECRACKER_VERSION = yield* Config.string("FIRECRACKER_VERSION").pipe(Config.withDefault("v1.11"));
    const FIRECRACKER_SOCKET_PATH = yield* _(
      Config.string("FIRECRACKER_SOCKET_PATH").pipe(Config.withDefault("/tmp/firecracker.sock"))
    );
    const dispatcher = new Agent({
      connect: {
        socketPath: FIRECRACKER_SOCKET_PATH,
      },
    });

    // Refs
    const firecrackerPidRef = yield* Ref.make(0);
    const firecrackerSocketPathRef = yield* Ref.make("");
    const firecrackerRuns = yield* Ref.make(false);

    // Variabales
    const vmsSafePath = yield* get_safe_path("prepare");

    // Functions
    const getKernelFile = (
      setupDir: string,
      linux_version: string = "6.1.102",
      firecracker_version: string = "v1.10"
    ) =>
      Effect.gen(function* (_) {
        const filename = `linux-${firecracker_version}-${arch}-${linux_version}`;

        //example: https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/v1.10/x86_64/vmlinux-6.1.102
        const LINUX_URL = `https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/${firecracker_version}/${arch}/vmlinux-${linux_version}`;

        const linuxDir = path.join(setupDir, `linux-${firecracker_version}-${arch}-${linux_version}`);
        const linuxDirExists = yield* fs.exists(linuxDir);

        if (!linuxDirExists) {
          yield* fs.makeDirectory(linuxDir, { recursive: true });
          yield* downloaded_file(
            FileDownload.make({
              filename,
              exists: false,
              from: new URL(LINUX_URL),
              to: path.join(linuxDir, filename),
            })
          );
        }

        return path.join(linuxDir, filename); // Return the path to the extracted Linux
      });

    const getDownloadLink = <A extends keyof typeof DOWNLOAD_LINKS, V extends keyof (typeof DOWNLOAD_LINKS)[A]>(
      arch: A,
      firecracker_version: V
    ) => {
      const dl = DOWNLOAD_LINKS[arch];
      const dlfc = dl[firecracker_version];
      if (dlfc) {
        return dlfc;
      }
      return dl["v1.11"];
    };

    const getRootfs = (
      setupDirectory: string,
      linuxVersion: string = "6.1",
      firecracker_version: keyof (typeof DOWNLOAD_LINKS)["x64"] = "v1.10"
    ) =>
      Effect.gen(function* (_) {
        const dl_arch = process.arch === "x64" ? "x64" : "aarch64";
        const dl = getDownloadLink(dl_arch, firecracker_version);

        const filename = path.basename(`${dl.os}.upstream`);
        let rootFsFile = FileDownload.make({
          from: new URL(dl.os),
          filename,
          to: path.join(setupDirectory, filename),
          exists: false,
        });
        yield* logger.info("downloadRootfs", `Checking if upstream file exists ${rootFsFile.to}`);
        const rootsFile_exists = yield* fs.exists(path.join(setupDirectory, filename));

        if (!rootsFile_exists) {
          yield* logger.info("downloadRootfs", `Downloading rootfs for ${linuxVersion} ${firecracker_version}`);
          rootFsFile = yield* downloaded_file(rootFsFile);
        }

        const unsquashed_folder = `unsquashed-${path.basename(dl.os).replace(".squashfs", "")}`;
        yield* logger.info("downloadRootfs", `Checking for ${path.join(setupDirectory, unsquashed_folder)}`);
        const squashfs_root_exists = yield* fs.exists(path.join(setupDirectory, unsquashed_folder));
        if (!squashfs_root_exists) {
          yield* logger.info("downloadRootfs", `Unsquashing the ${filename} to ${unsquashed_folder}`);
          const unsquashfs_com = Command.make("unsquashfs", "-d", unsquashed_folder, rootFsFile.to).pipe(
            Command.workingDirectory(setupDirectory),
            env
          );
          const unsquashfs_process = yield* run_command_withLogger(unsquashfs_com, "downloadRootfs", logger);

          const unsquashfs_exit_code = yield* unsquashfs_process.exitCode;
          if (unsquashfs_exit_code !== 0) {
            return yield* Effect.fail(
              FireCrackerDownloadFailed.make({ exitCode: unsquashfs_exit_code, message: "unsquashfs failed" })
            );
          }
        }

        const id_rsa_name = path.basename(dl.os).replace(".squashfs", ".id_rsa");
        const id_rsa_path = path.join(setupDirectory, unsquashed_folder, "root", ".ssh", id_rsa_name);
        const id_rsa_exists = yield* fs.exists(id_rsa_path);
        if (!id_rsa_exists) {
          yield* logger.error("downloadRootfs", "id_rsa does not exist, generating...");
          const ssh_keygen_com = Command.make("ssh-keygen", "-f", id_rsa_name, "-N", '""').pipe(
            Command.workingDirectory(path.join(setupDirectory, unsquashed_folder, "root", ".ssh")),
            env
          );

          const ssh_keygen_process = yield* run_command_withLogger(ssh_keygen_com, "downloadRootfs", logger);
          const ssh_keygen_exit_code = yield* ssh_keygen_process.exitCode;
          if (ssh_keygen_exit_code !== 0) {
            return yield* Effect.fail(
              FireCrackerDownloadFailed.make({ exitCode: ssh_keygen_exit_code, message: "ssh_keygen failed" })
            );
          }
          // cp id_rsa.pub authorized_keys
          const cp_com = Command.make("cp", `${id_rsa_name}.pub`, "authorized_keys").pipe(
            Command.workingDirectory(path.join(setupDirectory, unsquashed_folder, "root", ".ssh")),
            env
          );
          const cp_process = yield* run_command_withLogger(cp_com, "downloadRootfs", logger);
          const cp_exit_code = yield* cp_process.exitCode;
          if (cp_exit_code !== 0) {
            return yield* Effect.fail(FireCrackerDownloadFailed.make({ exitCode: cp_exit_code, message: "cp failed" }));
          }

          // sudo chown -R root:root unsquashed_folder
          const chown_com = Command.make(
            "sudo",
            "chown",
            "-R",
            "root:root",
            path.join(setupDirectory, unsquashed_folder)
          ).pipe(Command.workingDirectory(setupDirectory), env);
          const chown_process = yield* run_command_withLogger(chown_com, "downloadRootfs", logger);
          const chown_exit_code = yield* chown_process.exitCode;
          if (chown_exit_code !== 0) {
            return yield* Effect.fail(
              FireCrackerDownloadFailed.make({ exitCode: chown_exit_code, message: "chown failed" })
            );
          }

          const truncate_com = Command.make(
            "truncate",
            "-s",
            "400M",
            path.basename(dl.os).replace(".squashfs", ".ext4")
          ).pipe(Command.workingDirectory(setupDirectory), env);

          const truncate_process = yield* run_command_withLogger(truncate_com, "downloadRootfs", logger);
          const truncate_exit_code = yield* truncate_process.exitCode;
          if (truncate_exit_code !== 0) {
            return yield* Effect.fail(
              FireCrackerDownloadFailed.make({ exitCode: truncate_exit_code, message: "truncation failed" })
            );
          }

          const mkfs_ext4_com = Command.make(
            "mkfs.ext4",
            "-d",
            path.join(setupDirectory, unsquashed_folder),
            "-F",
            path.basename(dl.os).replace(".squashfs", ".ext4")
          ).pipe(Command.workingDirectory(setupDirectory), env);

          const mkfs_ext4_process = yield* run_command_withLogger(mkfs_ext4_com, "downloadRootfs", logger);
          const mkfs_ext4_exit_code = yield* mkfs_ext4_process.exitCode;
          if (mkfs_ext4_exit_code !== 0) {
            return yield* Effect.fail(
              FireCrackerDownloadFailed.make({ exitCode: truncate_exit_code, message: "mkfs.ext4 failed" })
            );
          }
        }

        return path.join(setupDirectory, unsquashed_folder);
      });

    const downloadFirecrackerBinary = (setupDirectory: string, version: string = "v1.10") =>
      Effect.gen(function* (_) {
        const fs = yield* _(FileSystem.FileSystem);
        const separator = process.platform === "win32" ? ";" : ":";
        const PathConfig = yield* Config.string("PATH").pipe(Config.withDefault(""));
        const PATH = PathConfig.split(separator)
          .filter((p) => !p.includes(" "))
          .join(separator);

        const env = Command.env({
          PATH,
        });

        const path = yield* _(Path.Path);
        const arch = process.arch === "x64" ? "x86_64" : "aarch64";

        const filename = `firecracker-${version}-${arch}.tgz`;
        const releaseURL = new URL(
          `https://github.com/firecracker-microvm/firecracker/releases/download/${version}/${filename}`
        );
        const downloadPath = path.join(setupDirectory, filename);

        const fc_d = FileDownload.make({
          from: releaseURL,
          filename: filename,
          to: downloadPath,
          exists: false,
        });

        const firecracker_file_exists = yield* fs.exists(downloadPath);
        if (!firecracker_file_exists) {
          yield* downloaded_file(fc_d);

          yield* logger.info("downloadFirecrackerBinary", `Untaring the ${downloadPath}`);

          // untar the downloaded file
          // to be under `firecracker`
          const untar_com = Command.make("tar", "-xzf", downloadPath).pipe(
            Command.workingDirectory(setupDirectory),
            env
          );

          const untar_process = yield* run_command_withLogger(untar_com, "downloadFirecrackerBinary", logger);
          const untar_exit_code = yield* untar_process.exitCode;
          if (untar_exit_code !== 0) {
            return yield* Effect.fail(
              FireCrackerDownloadFailed.make({ exitCode: untar_exit_code, message: "untar failed" })
            );
          }
        }

        return path.join(setupDirectory, `release-${version}-${arch}/firecracker-${version}-${arch}`);
      });

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

    const setup = (setupDir: string = "./firecracker-setup") =>
      Effect.gen(function* (_) {
        const fs = yield* _(FileSystem.FileSystem);
        const FIRECRACKER_SETUP_DIR = yield* Config.string("FIRECRACKER_SETUP_DIR").pipe(Config.withDefault(setupDir));
        const FIRECRACKER_VERSION = yield* Config.string("FIRECRACKER_VERSION").pipe(Config.withDefault("v1.11"));
        const FIRECRACKER_MAIN_VERSION = getMainVersion(FIRECRACKER_VERSION as keyof (typeof DOWNLOAD_LINKS)["x64"]);
        const FIRECRACKER_LINUX_VERSION = yield* Config.string("FIRECRACKER_LINUX_VERSION").pipe(
          Config.withDefault("6.1.102")
        );
        // const LINUX_MICROVM_CONFIG_URL = `https://raw.githubusercontent.com/firecracker-microvm/firecracker/refs/heads/main/resources/guest_configs/microvm-kernel-ci-x86_64-${FIRECRACKER_LINUX_VERSION}.config`;

        const start = Date.now();
        const starting_dir = yield* get_safe_path(FIRECRACKER_SETUP_DIR);
        const starting_dir_exists = yield* fs.exists(starting_dir);
        if (!starting_dir_exists) {
          yield* fs.makeDirectory(starting_dir, { recursive: true });
        }

        const vmlinux = yield* getKernelFile(starting_dir, FIRECRACKER_LINUX_VERSION, FIRECRACKER_MAIN_VERSION);
        const rootfs = yield* getRootfs(starting_dir, FIRECRACKER_LINUX_VERSION, FIRECRACKER_MAIN_VERSION);
        const firecracker = yield* downloadFirecrackerBinary(starting_dir, FIRECRACKER_VERSION);

        const duration = Date.now() - start;

        yield* logger.info("setup", `\nFirecracker setup complete! (${duration}ms)`);

        return { vmlinux, rootfs, firecracker };
      });

    const close = (options?: { bypass: { isRunning: boolean } }) =>
      Effect.gen(function* (_) {
        const mergeOptions = { bypass: { isRunning: false } };
        const opts = options ? { ...mergeOptions, ...options } : mergeOptions;

        const isRunning = yield* Ref.get(firecrackerRuns);

        if (!isRunning || !opts.bypass.isRunning) {
          return yield* Effect.void;
        }

        const firecrackerSocketPath = yield* Ref.get(firecrackerSocketPathRef);
        // if the socket is being used, kill the process
        const killProcess = yield* run_command_withLogger(
          Command.make("fuser", "-k", firecrackerSocketPath),
          "close",
          logger
        );
        const killExitCode = yield* killProcess.exitCode;
        if (killExitCode !== 0) {
          return yield* Effect.fail(
            FireCrackerFailedToBoot.make({ path: firecrackerSocketPath, message: "Failed to kill fuser process" })
          );
        }
        yield* fs.remove(firecrackerSocketPath, { force: true });
      });

    const prepare = () =>
      Effect.gen(function* (_) {
        const runsAlready = yield* Ref.get(firecrackerRuns);
        if (runsAlready) {
          return yield* Effect.void;
        }
        const vmsFolderExists = yield* fs.exists(vmsSafePath);
        if (!vmsFolderExists) {
          yield* fs.makeDirectory(vmsSafePath, { recursive: true });
        }

        const { vmlinux, firecracker, rootfs } = yield* setup(vmsSafePath);

        yield* logger.info("Firecracker binary is located at: " + firecracker);
        yield* logger.info("VMLinux file is located at: " + vmlinux);
        yield* logger.info("RootFS file is located at: " + rootfs);

        const firecrackerSocketPath = yield* get_safe_path(FIRECRACKER_SOCKET_PATH);
        yield* Ref.update(firecrackerSocketPathRef, () => firecrackerSocketPath);

        const firecrackerSocketPathExists = yield* fs.exists(firecrackerSocketPath);
        if (firecrackerSocketPathExists) {
          yield* close({ bypass: { isRunning: true } });
        }

        const firecrackerCommand = Command.make(firecracker, "--api-sock", firecrackerSocketPath).pipe(
          Command.runInShell(true)
        );

        const forwardPortCommand = Command.make(
          "socat",
          `TCP-LISTEN:${FIRECRACKER_PORT},fork,reuseaddr`,
          `UNIX-CONNECT:${firecrackerSocketPath}`
        );

        const { bootProcess: bootProcess, forwardFirecrackerPort: forwardFirecrackerPort } = yield* Effect.all({
          bootProcess: run_command(firecrackerCommand, true),
          forwardFirecrackerPort: run_command(forwardPortCommand, true),
        });
        const firecracker_is_running = yield* bootProcess.isRunning;
        if (!firecracker_is_running) {
          return yield* Effect.fail(FireCrackerFailedToBoot.make({ path: firecracker, message: "Failed to boot VM" }));
        }
        yield* logger.info(`Firecracker is running (PID:${bootProcess.pid})`);

        const portForwardIsRunning = yield* forwardFirecrackerPort.isRunning;

        if (!portForwardIsRunning) {
          return yield* Effect.fail(
            FireCrackerFailedToBoot.make({ path: firecracker, message: "Failed to forward port" })
          );
        }
        yield* logger.info(`Port forwarding is running (PID:${forwardFirecrackerPort.pid})`);

        // get the pid of the firecracker process
        const firecrackerPid = yield* Command.make("fuser", "-v", firecrackerSocketPath).pipe(env, Command.string);
        yield* logger.info("prepare", "fuser output", firecrackerPid);
        const fcPif = Number.parseInt(firecrackerPid);
        if (Number.isNaN(fcPif)) {
          yield* logger.error("prepare", "Failed to get firecracker pid");
          return yield* Effect.fail(
            FireCrackerFailedToBoot.make({ path: firecracker, message: "Failed to get firecracker pid" })
          );
        }
        yield* Ref.update(firecrackerPidRef, () => Number.parseInt(firecrackerPid));
        yield* Ref.update(firecrackerRuns, () => true);

        return yield* Effect.void;
      });

    const createFirecrackerVM = (config: VmConfig) =>
      Effect.gen(function* (_) {
        // first boot-source
        yield* logger.info("createFirecrackerVM", "boot-source", JSON.stringify(config.boot_source));
        const bootSourceResponse = yield* socket_fetch("PUT", `${FIRECRACKER_URL}/boot-source`, config.boot_source);

        if (bootSourceResponse.status !== 204) {
          return yield* Effect.fail(FireCrackerVmNotCreated.make({ message: "Failed to create VM" }));
        }
        // then drives
        yield* logger.info("createFirecrackerVM", "drives", JSON.stringify(config.drives));
        const drivesResponse = yield* socket_fetch("PUT", `${FIRECRACKER_URL}/drives`, config.drives);

        if (drivesResponse.status !== 204) {
          return yield* Effect.fail(FireCrackerVmNotCreated.make({ message: "Failed to create VM" }));
        }

        // then network-interfaces
        yield* logger.info("createFirecrackerVM", "network-interfaces", JSON.stringify(config.network_interfaces));
        const networkInterfacesResponse = yield* socket_fetch(
          "PUT",
          `${FIRECRACKER_URL}/network-interfaces`,
          config.network_interfaces
        );

        if (networkInterfacesResponse.status !== 204) {
          return yield* Effect.fail(FireCrackerVmNotCreated.make({ message: "Failed to create VM" }));
        }

        // then machine-config
        yield* logger.info("createFirecrackerVM", "machine-config", JSON.stringify(config.machine_config));
        const machineConfigResponse = yield* socket_fetch(
          "PUT",
          `${FIRECRACKER_URL}/machine-config`,
          config.machine_config
        );

        if (machineConfigResponse.status !== 204) {
          return yield* Effect.fail(FireCrackerVmNotCreated.make({ message: "Failed to create VM" }));
        }

        // then volumes
        yield* logger.info("createFirecrackerVM", "volumes", JSON.stringify(config.volumes));
        const volumesResponse = yield* socket_fetch("PUT", `${FIRECRACKER_URL}/volumes`, config.volumes);

        if (volumesResponse.status !== 204) {
          return yield* Effect.fail(FireCrackerVmNotCreated.make({ message: "Failed to create VM" }));
        }

        // return the vmId
        return VmId.make(cuid2());
      });

    const socket_fetch = (method: string, url: string, body: any) =>
      Effect.tryPromise((signal) =>
        undici_fetch(url, {
          method,
          dispatcher,
          body: JSON.stringify(body),
          signal,
        })
      );

    const startFirecrackerVM = (vmId: string) =>
      Effect.gen(function* (_) {
        // unix-socket send action

        const response = yield* socket_fetch("PUT", `${FIRECRACKER_URL}/actions`, {
          action_type: "InstanceStart",
        });

        if (response.status !== 200) {
          return yield* Effect.fail(FireCrackerFailedToStartVM.make({ message: "Failed to start VM", vmId }));
        }

        return yield* Effect.promise(() => response.text());
      });

    const createVmConfiguration = (
      os_ext4: `${string}.ext4`,
      config: typeof DEFAULT_VM_CONFIG_OPTIONS,
      firecracker_version: string,
      arch: string,
      linux_version: string
    ) =>
      Effect.gen(function* (_) {
        const mergedConfig = { ...DEFAULT_VM_CONFIG_OPTIONS, ...config };

        const host_drives = yield* getHostDrives().pipe(
          Effect.catchTags({
            SystemError: () => Effect.succeed([] as Drive[]),
            BadArgument: () => Effect.succeed([] as Drive[]),
          })
        );

        const vmlinux = yield* get_safe_path(
          path.join(vmsSafePath, `linux-${firecracker_version}-${arch}-${linux_version}`)
        );

        return VmConfigSchema.make({
          boot_source: {
            kernel_image_path: vmlinux,
            boot_args: "console=ttyS0 noapic reboot=k panic=1 pci=off nomodules",
          },
          drives: [
            {
              drive_id: "rootfs",
              path_on_host: os_ext4,
              is_read_only: false,
              is_root_device: true,
            },
            ...host_drives,
          ],
          network_interfaces: [
            // {
            //   iface_id: "eth0",
            //   guest_mac: "AA:BB:CC:DD:EE:FF",
            //   host_dev_name: "tap0",
            // },
          ],
          machine_config: {
            vcpu_count: mergedConfig.resources?.cpu || 1,
            mem_size_mib: mergedConfig.resources?.memory || 128,
          },
          volumes: mergedConfig.volumes ?? [],
        });
      });

    const destroyFirecrackerVM = (_vmId: string) =>
      Effect.gen(function* (_) {
        const response = yield* socket_fetch("PUT", `${FIRECRACKER_URL}/actions`, {
          action_type: "SendCtrlAltDel",
        });

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
        const os_ext4 = (yield* get_safe_path(path.join(vmsSafePath, run.config.os))) as `${string}.ext4`;
        const arch = process.arch === "x64" ? "x86_64" : "aarch64";

        yield* logger.info("run", "creating vm configuration");
        const vmConfig = yield* createVmConfiguration(
          os_ext4,
          mergedConfig,
          FIRECRACKER_VERSION,
          arch,
          mergedConfig.linux
        );

        yield* logger.info("run", "creating firecracker vm");
        const firecracker_vmid = yield* createFirecrackerVM(vmConfig);

        yield* logger.info("run", "starting firecracker vm");
        yield* startFirecrackerVM(firecracker_vmid);

        // const executionResult = yield* executeCodeInVM(vmId, language, config.timeout || 10);

        if (!mergedConfig.persistent) {
          yield* logger.info("run", "destroying firecracker vm");
          yield* destroyFirecrackerVM(firecracker_vmid);
        }

        // return executionResult;
        return yield* Effect.void;
      });

    return { prepare, run, close } as const;
  }),
  dependencies: [BaseLoggerLive],
}) {}

export const FirecrackerLive = FirecrackerService.Default;
