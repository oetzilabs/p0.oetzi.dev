import { Command, FileSystem, Path } from "@effect/platform";
import { downloaded_file, get_safe_path, run_command } from "@p0/core/src/utils";
import { FileDownload } from "@p0/core/src/utils/schemas";
import { Config, Effect } from "effect";
import { FireCrackerDownloadFailed } from "./errors";

const downloadLinux = (setupDir: string, linux_version: string = "6.1.102", firecracker_version: string = "v1.10.1") =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);

    const arch = process.arch === "x64" ? "x86_64" : "aarch64";

    const filename = `linux-${firecracker_version}-${arch}-${linux_version}`;

    const LINUX_URL = `https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/${firecracker_version}/${arch}/vmlinux-${linux_version}`;

    const linuxDir = path.join(setupDir, `linux-${arch}-${linux_version}`);
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
const downloadLinks = {
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

const getDownloadLink = <A extends keyof typeof downloadLinks, V extends keyof (typeof downloadLinks)[A]>(
  arch: A,
  firecracker_version: V
) => {
  const dl = downloadLinks[arch];
  if (dl[firecracker_version]) {
    return dl[firecracker_version];
  }
  return dl["v1.11"];
};

const downloadRootfs = (
  setupDirectory: string,
  linuxVersion: string = "6.1",
  firecracker_version: keyof (typeof downloadLinks)["x64"] = "v1.10"
) =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);
    const separator = process.platform === "win32" ? ";" : ":";
    const arch = process.arch === "x64" ? "x86_64" : "aarch64";

    const PathConfig = yield* Config.string("PATH").pipe(Config.withDefault(""));
    const PATH = PathConfig.split(separator)
      .filter((p) => !p.includes(" "))
      .join(separator);

    const env = Command.env({
      PATH,
    });
    const dl_arch = process.arch === "x64" ? "x64" : "aarch64";
    const dl = getDownloadLink(dl_arch, firecracker_version);

    const filename = `rootfs-${firecracker_version}-${arch}-${linuxVersion}.squashfs`;
    let rootFsFile = FileDownload.make({
      from: new URL(dl.os),
      filename,
      to: path.join(setupDirectory, filename),
      exists: false,
    });

    const rootsFile_exists = yield* fs.exists(path.join(setupDirectory, filename));

    if (!rootsFile_exists) {
      yield* Effect.log(`Downloading rootfs for ${linuxVersion} ${firecracker_version}`);
      rootFsFile = yield* downloaded_file(rootFsFile);
    }

    const squashfs_root_exists = yield* fs.exists(path.join(setupDirectory, "squashfs-root"));
    if (!squashfs_root_exists) {
      const unsquashfs_com = Command.make("unsquashfs", rootFsFile.to).pipe(
        Command.workingDirectory(setupDirectory),
        env
      );
      const unsquashfs_process = yield* run_command(unsquashfs_com);

      const unsquashfs_exit_code = yield* unsquashfs_process.exitCode;
      if (unsquashfs_exit_code !== 0) {
        return yield* Effect.fail(
          FireCrackerDownloadFailed.make({ exitCode: unsquashfs_exit_code, message: "unsquashfs failed" })
        );
      }
    }

    const id_rsa_name = dl.os.split("/").pop()!.replace(".squashfs", ".id_rsa");
    const id_rsa_path = path.join(setupDirectory, "squashfs-root", "root", ".ssh", id_rsa_name);
    const id_rsa_exists = yield* fs.exists(id_rsa_path).pipe(Effect.catchAll(() => Effect.succeed(false)));
    if (!id_rsa_exists) {
      yield* Effect.log("id_rsa does not exist, generating...");
      const ssh_keygen_com = Command.make("ssh-keygen", "-f", id_rsa_name, "-N", '""').pipe(
        Command.workingDirectory(path.join(setupDirectory, "squashfs-root", "root", ".ssh")),
        env
      );

      const ssh_keygen_process = yield* run_command(ssh_keygen_com);
      const ssh_keygen_exit_code = yield* ssh_keygen_process.exitCode;
      if (ssh_keygen_exit_code !== 0) {
        return yield* Effect.fail(
          FireCrackerDownloadFailed.make({ exitCode: ssh_keygen_exit_code, message: "ssh_keygen failed" })
        );
      }
    }

    // chowning the squashfs-root directory to the current user
    yield* fs.chown(path.join(setupDirectory, "squashfs-root"), process.getuid?.()!, process.getgid?.()!);

    const truncate_com = Command.make("truncate", "-s", "400M", "ubuntu-24.04.ext4").pipe(
      Command.workingDirectory(setupDirectory),
      env
    );

    const truncate_process = yield* run_command(truncate_com);
    const truncate_exit_code = yield* truncate_process.exitCode;
    if (truncate_exit_code !== 0) {
      return yield* Effect.fail(
        FireCrackerDownloadFailed.make({ exitCode: truncate_exit_code, message: "truncation failed" })
      );
    }

    const mkfs_ext4_com = Command.make("mkfs.ext4", "-d", "squashfs-root", "-F", "ubuntu-24.04.ext4").pipe(
      Command.workingDirectory(setupDirectory),
      env
    );

    const mkfs_ext4_process = yield* run_command(mkfs_ext4_com);
    const mkfs_ext4_exit_code = yield* mkfs_ext4_process.exitCode;
    if (mkfs_ext4_exit_code !== 0) {
      return yield* Effect.fail(
        FireCrackerDownloadFailed.make({ exitCode: truncate_exit_code, message: "mkfs.ext4 failed" })
      );
    }

    return path.join(setupDirectory, "squashfs-root", "root", "ubuntu-24.04.ext4");
  });

const downloadFirecrackerBinary = (setupDirectory: string, version: string = "") =>
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

      yield* Effect.log(`Untaring the ${downloadPath}`);

      // untar the downloaded file
      // to be under `firecracker`
      const untar_com = Command.make("tar", "-xzf", downloadPath).pipe(Command.workingDirectory(setupDirectory), env);

      const untar_process = yield* run_command(untar_com);
      const untar_exit_code = yield* untar_process.exitCode;
      if (untar_exit_code !== 0) {
        return yield* Effect.fail(
          FireCrackerDownloadFailed.make({ exitCode: untar_exit_code, message: "untar failed" })
        );
      }
    }

    return path.join(setupDirectory, `release-${version}-${arch}/firecracker-${version}-${arch}`);
  });

const getMainVersion = <V extends keyof (typeof downloadLinks)["x64"]>(version: V) => {
  const versionParts = version.split(".") as [string, string, string] | [string, string];
  if (versionParts.length === 3) {
    return `${versionParts[0]}.${versionParts[1]}` as V;
  }
  if (versionParts.length === 2) {
    return `${versionParts[0]}.${versionParts[1]}` as V;
  }
  return version;
};

export const setup = (setupDir: string = "./firecracker-setup") =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const FIRECRACKER_SETUP_DIR = yield* Config.string("FIRECRACKER_SETUP_DIR").pipe(Config.withDefault(setupDir));
    const FIRECRACKER_VERSION = yield* Config.string("FIRECRACKER_VERSION").pipe(Config.withDefault("v1.11"));
    const FIRECRACKER_MAIN_VERSION = getMainVersion(FIRECRACKER_VERSION as keyof (typeof downloadLinks)["x64"]);
    const FIRECRACKER_LINUX_VERSION = yield* Config.string("FIRECRACKER_LINUX_VERSION").pipe(
      Config.withDefault("6.1.102")
    );
    const LINUX_MICROVM_CONFIG_URL = `https://raw.githubusercontent.com/firecracker-microvm/firecracker/refs/heads/main/resources/guest_configs/microvm-kernel-ci-x86_64-${FIRECRACKER_LINUX_VERSION}.config`;

    const start = Date.now();
    const starting_dir = yield* get_safe_path(FIRECRACKER_SETUP_DIR);
    const starting_dir_exists = yield* fs.exists(starting_dir);
    if (!starting_dir_exists) {
      yield* fs.makeDirectory(starting_dir, { recursive: true });
    }

    const vmlinux = yield* downloadLinux(starting_dir, FIRECRACKER_LINUX_VERSION);
    const rootfs = yield* downloadRootfs(starting_dir, FIRECRACKER_LINUX_VERSION, FIRECRACKER_MAIN_VERSION);
    const firecracker = yield* downloadFirecrackerBinary(starting_dir, FIRECRACKER_VERSION);

    const duration = Date.now() - start;

    yield* Effect.log(`\nFirecracker setup complete! (${duration}ms)`);

    return { vmlinux, rootfs, firecracker };
  });
