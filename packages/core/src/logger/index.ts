import { Effect, Layer, Logger } from "effect";
import { FileSystem, Path, PlatformLogger } from "@effect/platform";
import { BunFileSystem } from "@effect/platform-bun";

const clear_log_file = Effect.gen(function* (_) {
  const path = yield* _(Path.Path);
  const fs = yield* _(FileSystem.FileSystem);

  const cwd = process.cwd();
  const file = path.join(cwd, path.join("log.jsonl"));
  yield* fs.writeFileString(file, "");
});

export class BaseLoggerService extends Effect.Service<BaseLoggerService>()("@p0/core/logger/base_logger", {
  effect: Effect.gen(function* (_) {
    yield* clear_log_file;
    const format = (type: string, group: string, area: string, ...rest: any[]) =>
      `[${type}][${group}] ${area} ${rest.join(" ")}`;
    return {
      withGroup: (group: string) => ({
        info: (area: string, ...rest: any[]) => Effect.logInfo(format("info", group, area, ...rest)),
        warn: (area: string, ...rest: any[]) => Effect.logWarning(format("warn", group, area, ...rest)),
        error: (area: string, ...rest: any[]) => Effect.logError(format("error", group, area, ...rest)),
        debug: (area: string, ...rest: any[]) => Effect.logDebug(format("debug", group, area, ...rest)),
      }),
    };
  }),
  dependencies: [BunFileSystem.layer],
}) {}

export const BaseLoggerLive = BaseLoggerService.Default;

export const json_logger = Logger.jsonLogger.pipe(PlatformLogger.toFile("log.jsonl"));
