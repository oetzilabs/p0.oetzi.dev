import { BaseLoggerLive, BaseLoggerService } from "@p0/core/src/logger";
import { Config, Effect, pipe, Ref, Stream } from "effect";
import { Command, FileSystem, Path } from "@effect/platform";
import { type JailerConfig } from "./schema";
import {
  JailerFailedToStart,
  JailerMissingFirecrackerBinary,
  JailerMissingJailerBinary,
  JailerMissingSocketPath,
  JailerNotJailedYet,
} from "./errors";
import { userInfo } from "os";

export class JailerService extends Effect.Service<JailerService>()("@p0/vm/jailer/repo", {
  effect: Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);

    const base_logger = yield* _(BaseLoggerService);
    const logger = base_logger.withGroup("firecracker");
    const separator = process.platform === "win32" ? ";" : ":";
    const arch = process.arch === "x64" ? "x86_64" : "aarch64";

    const UID = userInfo().uid;
    const GID = userInfo().gid;

    const PathConfig = yield* Config.string("PATH").pipe(Config.withDefault(""));
    const PATH = PathConfig.split(separator)
      .filter((p) => !p.includes(" "))
      .join(separator);

    const env = Command.env({
      PATH,
      RUST_BACKTRACE: "1",
    });

    const jailedProcess = yield* Ref.make(new Map<string, Effect.Effect<void, any, any>>());

    yield* logger.info("composer", "Starting Jailer composer");

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

    const jail = (config: JailerConfig) =>
      Effect.gen(function* (_) {
        const firecrackerBinaryPathExists = yield* fs.exists(config.firecrackerBinaryPath);
        if (!firecrackerBinaryPathExists) {
          return yield* Effect.fail(
            JailerMissingFirecrackerBinary.make({
              message: `Firecracker binary path does not exist: ${config.firecrackerBinaryPath}`,
            })
          );
        }

        const jailerBinaryPathExists = yield* fs.exists(config.jailerBinaryPath);
        if (!jailerBinaryPathExists) {
          return yield* Effect.fail(
            JailerMissingJailerBinary.make({
              message: `Jailer binary path does not exist: ${config.jailerBinaryPath}`,
            })
          );
        }

        // const socketPathExists = yield* fs.exists(config.socketPath);
        // if (!socketPathExists) {
        //   return yield* Effect.fail(
        //     JailerMissingSocketPath.make({ message: `Socket path does not exist: ${config.socketPath}` })
        //   );
        // }

        const jailerCommand = Command.make(
          config.jailerBinaryPath,
          "--id",
          config.vmId,
          "--exec-file",
          config.firecrackerBinaryPath,
          "--gid",
          String(GID),
          "--uid",
          String(UID),
          "--daemonize",
          "--chroot-base-dir",
          config.root
        ).pipe(env);

        const jailerProcess = yield* run_command(jailerCommand, "jailer");

        // const jailerExitCode = yield* jailerProcess.exitCode;
        // if (jailerExitCode !== 0) {
        //   return yield* Effect.fail(
        //     JailerFailedToStart.make({
        //       message: `Jailer failed to start with exit code ${jailerExitCode}`,
        //     })
        //   );
        // }

        yield* Ref.update(jailedProcess, (map) => {
          map.set(
            config.vmId,
            Effect.gen(function* () {
              yield* jailerProcess.kill("SIGTERM");
            })
          );
          return map;
        });

        return config.vmId;
      });

    const close = (vmId: string) =>
      Effect.gen(function* (_) {
        const processes = yield* Ref.get(jailedProcess);
        if (!processes.has(vmId)) {
          return yield* Effect.fail(JailerNotJailedYet.make({ message: `VM ${vmId} is not jailed yet` }));
        }

        const jailerProcessExitFn = processes.get(vmId);

        if (jailerProcessExitFn) {
          yield* jailerProcessExitFn;
        }

        yield* Ref.update(jailedProcess, (map) => {
          map.delete(vmId);
          return map;
        });
      });

    return {
      jail,
      close,
    };
  }),
  dependencies: [BaseLoggerLive],
}) {}

export const JailerLive = JailerService.Default;
