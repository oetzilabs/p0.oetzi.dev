import { Command, FileSystem, Path } from "@effect/platform";
import { downloaded_file, get_safe_path, run_command } from "@p0/core/src/utils";
import { FileDownload } from "@p0/core/src/utils/schemas";
import { Config, Effect } from "effect";
import { FireCrackerDownloadFailed, FireCrackerFailedToMakeImages } from "./errors";

const configureLinux = (linuxPath: string, config_file_url: string) =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);

    // download the file
    const firecracker_config_path = path.join(linuxPath, ".config");
    const downloaded_config = yield* downloaded_file(
      FileDownload.make({
        filename: config_file_url,
        exists: false,
        from: new URL(config_file_url),
        to: firecracker_config_path,
      })
    );

    return firecracker_config_path;
  });

const downloadAndExtractLinux = (setupDir: string, version: string = "6.1") =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);
    const separator = process.platform === "win32" ? ";" : ":";

    const PathConfig = yield* Config.string("PATH").pipe(Config.withDefault(""));
    const PATH = PathConfig.split(separator)
      .filter((p) => !p.includes(" "))
      .join(separator);

    const filename = `linux-${version}.tar.xz`;

    // this can be at least 1.5GB big when unpacking the kernel
    const LINUX_URL = `https://cdn.kernel.org/pub/linux/kernel/v6.x/${filename}`;

    const linuxDir = path.join(setupDir, `linux-${version}`);
    const linuxArchive = path.join(setupDir, filename);
    const linuxDirExists = yield* fs.exists(linuxDir);

    if (!linuxDirExists) {
      const downloaded_linux = yield* downloaded_file(
        FileDownload.make({
          filename,
          exists: false,
          from: new URL(LINUX_URL),
          to: linuxArchive,
        })
      );
      yield* Effect.log(
        `Extracting Linux archive to ${linuxDir} via command: tar -xf ${downloaded_linux.to} -C ${setupDir}`
      );
      const untar_command = Command.make("tar", "-xf", downloaded_linux.to, "-C", setupDir).pipe(
        Command.workingDirectory(setupDir),
        Command.env({
          PATH,
        })
      );

      const untar_process = yield* run_command(untar_command);
      const untar_exit_code = yield* untar_process.exitCode;
      if (untar_exit_code !== 0) {
        return yield* Effect.fail(
          FireCrackerDownloadFailed.make({ exitCode: untar_exit_code, message: "tar -xzf failed" })
        );
      }
    }

    return linuxDir; // Return the path to the extracted Linux
  });

const buildLinux = (linuxPath: string) =>
  Effect.gen(function* (_) {
    const separator = process.platform === "win32" ? ";" : ":";

    const PathConfig = yield* Config.string("PATH").pipe(Config.withDefault(""));
    const PATH = PathConfig.split(separator)
      .filter((p) => !p.includes(" "))
      .join(separator);

    yield* Effect.log(`Building Linux in ${linuxPath}... This will take some time, please be patient.`);

    const com = Command.make("make", "vmlinux").pipe(
      Command.workingDirectory(linuxPath),
      Command.env({
        PATH,
      })
    );
    const build_command = yield* run_command(com);

    return build_command;
  });

const buildLinuxRootfs = (firecrackerPath: string) =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);
    const separator = process.platform === "win32" ? ";" : ":";

    const PathConfig = yield* Config.string("PATH").pipe(Config.withDefault(""));
    const PATH = PathConfig.split(separator)
      .filter((p) => !p.includes(" "))
      .join(separator);

    yield* Effect.log(`Building Linux rootfs with the firecracker devtools.`);

    // check if the `firecracker` folder exists
    const firecracker_folder = path.join(firecrackerPath, "firecracker");
    const firecracker_folder_exists = yield* fs.exists(firecracker_folder);
    if (!firecracker_folder_exists) {
      // git clone the firecracker repository
      const git_command = Command.make("git", "clone", "https://github.com/firecracker-microvm/firecracker.git").pipe(
        Command.workingDirectory(firecrackerPath),
        Command.env({
          PATH,
        })
      );
      const git_process = yield* run_command(git_command);
      const git_exit_code = yield* git_process.exitCode;
      if (git_exit_code !== 0) {
        return yield* Effect.fail(
          FireCrackerDownloadFailed.make({ exitCode: git_exit_code, message: "git clone failed" })
        );
      }
    }

    // command is: `./tools/devtool build_ci_artifacts rootfs`
    const com = Command.make("./tools/devtool", "build_ci_artifacts", "rootfs").pipe(
      Command.workingDirectory(path.join(firecrackerPath, "firecracker")),
      Command.env({
        PATH,
      })
    );
    const build_command = yield* run_command(com);

    return build_command;
  });

export const setup = (setupDir: string = "./firecracker-setup") =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);
    const FIRECRACKER_SETUP_DIR = yield* Config.string("FIRECRACKER_SETUP_DIR").pipe(Config.withDefault(setupDir));
    const FIRECRACKER_LINUX_VERSION = yield* Config.string("FIRECRACKER_LINUX_VERSION").pipe(Config.withDefault("6.1"));
    const LINUX_MICROVM_CONFIG_URL = `https://raw.githubusercontent.com/firecracker-microvm/firecracker/refs/heads/main/resources/guest_configs/microvm-kernel-ci-x86_64-${FIRECRACKER_LINUX_VERSION}.config`;

    const start = Date.now();
    const starting_dir = yield* get_safe_path(FIRECRACKER_SETUP_DIR);
    const starting_dir_exists = yield* fs.exists(starting_dir);
    if (!starting_dir_exists) {
      yield* fs.makeDirectory(starting_dir, { recursive: true });
    }

    const linux_directory = yield* downloadAndExtractLinux(starting_dir, FIRECRACKER_LINUX_VERSION);

    yield* configureLinux(linux_directory, LINUX_MICROVM_CONFIG_URL);

    const buildlinux_process = yield* buildLinux(linux_directory);
    const buildlinux_process_exit_code = yield* buildlinux_process.exitCode;
    yield* Effect.log("Buildlinux build complete: ", buildlinux_process_exit_code);

    const buildlinux_rootfs_process = yield* buildLinuxRootfs(starting_dir);
    const buildlinux_rootfs_process_exit_code = yield* buildlinux_rootfs_process.exitCode;
    yield* Effect.log("Buildlinux rootfs build complete: ", buildlinux_rootfs_process_exit_code);

    const kernelPath = path.join(linux_directory, "output", "images", "vmlinux");
    const rootfsPath = path.join(linux_directory, "output", "images", "ubuntu-22.04.ext4");
    const duration = Date.now() - start;

    yield* Effect.log(`\nFirecracker setup complete! (${duration}ms)`);

    return { kernelPath, rootfsPath };
  });
