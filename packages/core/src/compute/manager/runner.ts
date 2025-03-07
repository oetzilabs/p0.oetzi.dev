import { Effect, pipe, Stream } from "effect";
import { type ComputeBinary, type ComputeTask } from "../schemas";
import { BaseLoggerService } from "../../logger";
import { Command, FetchHttpClient, FileSystem, HttpClient, HttpClientRequest, Path, Worker } from "@effect/platform";
import { ComputeWorkerPool, ComputeWorkerPoolLive } from "./pool"; // Import worker pool
import { ComputeBinaryNotDownloaded } from "../errors";
import { env } from "bun";

export class ComputeRunner extends Effect.Service<ComputeRunner>()("@p0/core/compute/runner", {
  effect: Effect.gen(function* (_) {
    const workerPool = yield* _(ComputeWorkerPool);
    const path = yield* _(Path.Path);
    const fs = yield* _(FileSystem.FileSystem);

    const execute_task = (task: ComputeTask) =>
      Effect.gen(function* () {
        const execution = workerPool.execute(task.config);
        // yield* execution.pipe(
        //   Stream.runForEach((output) => Effect.log("compute_runner#execute:stream", "output", output))
        // );
        return execution;
      });
    const get_safe_local_path = (binary: ComputeBinary) =>
      Effect.gen(function* (_) {
        const homeDir = env.HOME || env.USERPROFILE || "/tmp"; // Fallback to /tmp
        const baseDir = path.join(homeDir, ".p0", "binaries"); // Consistent base directory
        const projectDir = path.join(baseDir, binary.id);
        // make the directory if it doesn't exist
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
          // download the binary
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
          // convert the buffer to a file
          const safe_local_path = yield* get_safe_local_path(binary);
          const file_path = path.join(safe_local_path, `${binary.id}.bin`);

          // safe the buffer to the file
          yield* Effect.try(() => fs.writeFile(file_path, buffer));
          return file_path;
        }
        return local_path;
      }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer));

    const execute_binary = (binary: ComputeBinary) =>
      pipe(
        // Start running the command and return a handle to the running process
        Command.start(
          Command.make(binary.local_path!, ...(binary.config.args ?? [])).pipe(
            Command.env(binary.config.environment ?? {})
          )
        ),
        Effect.flatMap((_process) => {
          // Capture the stream and update the state
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
