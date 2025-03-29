import { Command, FetchHttpClient, FileSystem, HttpClient, HttpClientRequest, Path } from "@effect/platform";
import { BunContext, BunFileSystem } from "@effect/platform-bun";
import { Chunk, Config, Effect, pipe, Stream } from "effect";
import { BaseLoggerService, type LoggerCollection } from "../logger";
import { DownloadNoUrlProvided } from "./errors";
import type { FileDownload } from "./schemas";

export const streamToArray = <T>(stream: Stream.Stream<T>) =>
  Effect.gen(function* (_) {
    return yield* Stream.runCollect(stream).pipe(Effect.map(Chunk.toArray));
  });

export const fetch = (request: HttpClientRequest.HttpClientRequest) =>
  Effect.gen(function* (_) {
    const client = yield* _(HttpClient.HttpClient);
    const response = yield* client.execute(request);
    return response;
  });

export const downloaded_file = (fd: FileDownload) =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const base_logger = yield* _(BaseLoggerService);
    const logger = base_logger.withGroup("download");
    const force = fd.force ?? false;

    if (fd.exists) {
      if (force === false) {
        logger.info("download", "File already exists, skipping", fd.to);
        return yield* Effect.succeed(fd);
      }
    }
    if (!fd.from) {
      logger.error("download", "No url provided for", fd.to);
      return yield* Effect.fail(DownloadNoUrlProvided);
    }

    const exists = yield* fs.exists(fd.to);
    if (exists && !force) {
      logger.info("download", "File already exists, skipping", fd.to);
      return yield* Effect.succeed(fd);
    }

    logger.info("download", "Downloading", fd.from, "to", fd.to);

    const request = HttpClientRequest.make("GET")(fd.from);

    const response = yield* fetch(request).pipe(
      Effect.catchTag("ResponseError", () => Effect.succeed({ stream: Stream.make(new Uint8Array()) })),
      Effect.catchTag("RequestError", () => Effect.succeed({ stream: Stream.make(new Uint8Array()) }))
    ) as Effect.Effect<{ stream: Stream.Stream<Uint8Array<ArrayBuffer>, never, never> }, never, never>;
    const stream = response.stream;
    const bytes = yield* streamToArray(stream);
    const totalLength = bytes.reduce((acc, curr) => acc + curr.length, 0);
    const concatted = new Uint8Array(totalLength);
    let offset = 0;
    for (const byte of bytes) {
      concatted.set(byte, offset);
      offset += byte.length;
      logger.info("download", `Downloaded ${offset}/${totalLength}`);
    }
    yield* fs.writeFile(fd.to, concatted);
    logger.info("download", `Downloaded ${totalLength} bytes to ${fd.to}`);
    return yield* Effect.succeed({ ...fd, exists: true } as FileDownload);
  }).pipe(
    Effect.catchAll(() => Effect.succeed({ ...fd, exists: false } as FileDownload)),
    Effect.provide(BunFileSystem.layer),
    Effect.provide(FetchHttpClient.layer),
    Effect.provide(BunContext.layer)
  );
export const get_safe_path = (filepath: string) =>
  Effect.gen(function* (_) {
    const path = yield* _(Path.Path);
    const HOME = yield* Config.string("HOME").pipe(Config.withDefault("/tmp"));

    const is_absolute = path.isAbsolute(filepath);
    if (is_absolute) {
      return filepath;
    }
    return path.join(HOME, ".p0", "vms", filepath);
  });

export const run_command = (com: Command.Command, ignore_logging: boolean = false) =>
  Effect.gen(function* (_) {
    const _process = yield* pipe(
      Command.start(com),
      Effect.flatMap((_process) =>
        Effect.gen(function* (_) {
          const stdoutStream = _process.stdout.pipe(Stream.decodeText("utf8"));
          const stderrStream = _process.stderr.pipe(Stream.decodeText("utf8"));

          yield* stdoutStream.pipe(
            Stream.runForEach((line) => (ignore_logging ? Effect.void : Effect.log(line))),
            Effect.fork
          );

          yield* stderrStream.pipe(
            Stream.runForEach((line) => (ignore_logging ? Effect.void : Effect.logError(line))),
            Effect.fork
          );
          return _process;
        })
      )
    );
    return _process;
  });

export const run_command_withLogger = (com: Command.Command, area: string, logger: LoggerCollection) =>
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

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
