import { Command, FetchHttpClient, FileSystem, HttpClient, Path } from "@effect/platform";
import { Config, Effect, pipe, Stream } from "effect";
import { ComputeBinaryNotDownloaded } from "../errors";
import { type ComputeBinary, type ComputeTask } from "../schemas";
import { ComputeWorkerPool, ComputeWorkerPoolLive } from "./pool";

export class ComputeRunner extends Effect.Service<ComputeRunner>()("@p0/core/compute/runner", {
  effect: Effect.gen(function* (_) {
    const workerPool = yield* _(ComputeWorkerPool);
    const path = yield* _(Path.Path);
    const fs = yield* _(FileSystem.FileSystem);

    const HOME_DIR = yield* Config.string("HOME").pipe(Config.withDefault("/tmp"));

    const execute_task = (task: ComputeTask) => workerPool.execute(task.config);

    const get_safe_local_path = (binary: ComputeBinary) =>
      Effect.gen(function* (_) {
        const baseDir = path.join(HOME_DIR, ".p0", "binaries");
        const projectDir = path.join(baseDir, binary.id);

        const exists = yield* fs.exists(projectDir);
        if (!exists) {
          yield* fs.makeDirectory(projectDir, { recursive: true });
        }
        return projectDir;
      });

    const prepare_binary = (binary: ComputeBinary) =>
      Effect.gen(function* (_) {
        const local_path = binary.local_path;
        if (!local_path) {
          const is_file_protocol = binary.download_url.startsWith("file://");
          if (!is_file_protocol) {
            const fetcher = HttpClient.get(binary.download_url, { headers: { "User-Agent": "@p0/user-agent" } }).pipe(
              Effect.catchTags({
                RequestError: (e) =>
                  Effect.fail(
                    new ComputeBinaryNotDownloaded({
                      error: e.message,
                    })
                  ),
                ResponseError: (e) =>
                  Effect.fail(
                    new ComputeBinaryNotDownloaded({
                      error: e.message,
                    })
                  ),
              })
            );
            const response = yield* fetcher;
            if (response.status !== 200) {
              return yield* Effect.fail(
                new ComputeBinaryNotDownloaded({
                  error: "Response status is not 200",
                })
              );
            }
            const buffer = yield* response.arrayBuffer.pipe(Effect.map((ab) => Buffer.from(ab)));

            const safe_local_path = yield* get_safe_local_path(binary);
            const file_path = path.join(safe_local_path, `${binary.id}.bin`);

            yield* Effect.try(() => fs.writeFile(file_path, buffer));
            return file_path;
          }
          return binary.download_url.split("file://")[1];
        }
        return local_path;
      }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer));

    const execute_binary = (binary: ComputeBinary) =>
      pipe(
        Command.start(
          Command.make(binary.local_path!, ...(binary.config.args ?? [])).pipe(
            Command.env(binary.config.environment ?? {})
          )
        ),
        Effect.flatMap((_process) => {
          return Effect.gen(function* () {
            const stdoutStream = _process.stdout.pipe(Stream.decodeText("utf8"));
            const stderrStream = _process.stderr.pipe(Stream.decodeText("utf8"));

            return [stdoutStream, stderrStream] as const;
          });
        })
      );

    return { execute_task, execute_binary, prepare_binary } as const;
  }),
  dependencies: [ComputeWorkerPoolLive],
}) {}

export const ComputeRunnerLive = ComputeRunner.Default;
