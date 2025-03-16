import { Command, FileSystem, Path } from "@effect/platform";
import { downloaded_file, get_safe_path } from "@p0/core/src/utils";
import { FileDownload } from "@p0/core/src/utils/schemas";
import { Config, Effect, pipe, Stream } from "effect";
import { FireCrackerFailedToMakeImages } from "./errors";

const run_command = (com: Command.Command) =>
  Effect.gen(function* (_) {
    const _process = yield* pipe(
      Command.start(com),
      Effect.flatMap((_process) =>
        Effect.gen(function* (_) {
          const stdoutStream = _process.stdout.pipe(Stream.decodeText("utf8"));
          const stderrStream = _process.stderr.pipe(Stream.decodeText("utf8"));

          yield* stdoutStream.pipe(
            Stream.runForEach((line) => Effect.log(line)),
            Effect.fork
          );

          // Accumulate output from stderr
          yield* stderrStream.pipe(
            Stream.runForEach((line) => Effect.logError(line)),
            Effect.fork
          );
          return _process;
        })
      )
    );
    return _process;
  });

const buildBuildroot = (buildrootPath: string) =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);
    const separator = process.platform === "win32" ? ";" : ":";

    const PathConfig = yield* Config.string("PATH").pipe(Config.withDefault(""));
    const PATH = PathConfig.split(separator)
      .filter((p) => !p.includes(" "))
      .join(separator);

    yield* Effect.log(`Building Buildroot in ${buildrootPath}... This will take some time, please be patient.`);

    // yield* Effect.log(`Setting alldefconfig first.`);
    // check if the firecracker_defconfig file exists(firecracker_defconfig_path);
    // const alldefconfig_command = Command.make("make", "-s", "alldefconfig").pipe(
    //   Command.workingDirectory(buildrootPath),
    //   Command.env({
    //     PATH,
    //   })
    // );
    // yield* run_command(alldefconfig_command);

    yield* fs.makeDirectory(path.join(buildrootPath, "output", "target", "usr", "libexec"), { recursive: true });

    // check if the .firecracker.config exists in the cwd
    const firecracker_config_path = path.join(process.cwd(), ".firecracker.config");
    const fcc_exists = yield* fs.exists(firecracker_config_path);
    if (!fcc_exists) {
      return yield* Effect.fail(
        FireCrackerFailedToMakeImages.make({ message: ".firecracker.config not found", path: firecracker_config_path })
      );
    }
    // copy the .firecracker.config to the buildroot directory
    yield* fs.copyFile(firecracker_config_path, path.join(buildrootPath, ".config"));

    const com = Command.make("make", "-s").pipe(
      Command.workingDirectory(buildrootPath),
      Command.env({
        PATH,
      })
    );
    const build_command = yield* run_command(com);

    const linux_com = Command.make("make", "-s", "linux-rebuild").pipe(
      Command.workingDirectory(buildrootPath),
      Command.env({
        PATH,
      })
    );
    yield* run_command(linux_com);

    return build_command;
  });

const configureBuildroot = (buildrootPath: string) =>
  Effect.gen(function* (_) {
    const PATH =
      process.env.PATH?.split(process.platform === "win32" ? ";" : ":")
        .filter((p) => !p.includes(" ")) // Remove paths with spaces
        .join(process.platform === "win32" ? ";" : ":") || "";

    yield* Effect.log(`Configuring Buildroot in ${buildrootPath}... This will take some time, please be patient.`); // -s to silence output
    yield* Effect.log(`PATH=${PATH} make -s alldefconfig`);
    const com = Command.make("make", "-s", "alldefconfig").pipe(
      Command.workingDirectory(buildrootPath),
      Command.env({
        PATH,
      })
    );
    return yield* run_command(com);
  });

const downloadAndExtractBuildroot = (setupDir: string, version: string = "2024.08.3") =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);

    const BUILDROOT_URL = `https://buildroot.org/downloads/buildroot-${version}.tar.gz`;

    const buildrootFilename = `buildroot-${version}.tar.gz`;
    const buildrootDir = path.join(setupDir, `buildroot-${version}`);
    const buildrootArchive = path.join(setupDir, buildrootFilename);
    const buildrootDirExists = yield* fs.exists(buildrootDir);

    if (!buildrootDirExists) {
      const downloaded_buildroot = yield* downloaded_file(
        FileDownload.make({
          filename: buildrootFilename,
          exists: false,
          from: new URL(BUILDROOT_URL),
          to: buildrootArchive,
        })
      );
      yield* Effect.log(
        `Extracting Buildroot archive to ${buildrootDir} via command: tar -xzf ${downloaded_buildroot.to} -C ${setupDir}`
      );
      yield* Command.make("tar", "-xzf", downloaded_buildroot.to, "-C", setupDir).pipe(Command.exitCode);
    }

    return buildrootDir; // Return the path to the extracted Buildroot
  });

export const setup = (setupDir: string = "./firecracker-setup") =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);
    const FIRECRACKER_SETUP_DIR = yield* Config.string("FIRECRACKER_SETUP_DIR").pipe(Config.withDefault(setupDir));
    const starting_dir = yield* get_safe_path(FIRECRACKER_SETUP_DIR);
    const starting_dir_exists = yield* fs.exists(starting_dir);
    if (!starting_dir_exists) {
      yield* fs.makeDirectory(starting_dir, { recursive: true });
    }

    const buildrootDir = yield* downloadAndExtractBuildroot(starting_dir);

    const configure_buildroot = yield* configureBuildroot(buildrootDir);
    const configure_buildroot_exit_code = yield* configure_buildroot.exitCode;

    yield* Effect.log("Buildroot config complete: ", configure_buildroot_exit_code);

    const buildroot_process = yield* buildBuildroot(buildrootDir);

    const buildroot_process_exit_code = yield* buildroot_process.exitCode;

    yield* Effect.log("Buildroot build complete: ", buildroot_process_exit_code);

    // 5. Print paths to kernel and rootfs
    const kernelPath = path.join(buildrootDir, "output", "images", "vmlinux");
    const rootfsPath = path.join(buildrootDir, "output", "images", "rootfs.ext2");

    yield* Effect.log("\nFirecracker setup complete!");
    yield* Effect.log(`Kernel image path: ${kernelPath}`);
    yield* Effect.log(`Root filesystem path: ${rootfsPath}`);

    return { kernelPath, rootfsPath };
  });
