import { Config, Effect, Layer, Logger } from "effect";
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
    const with_debug = yield* Config.boolean("DEBUG").pipe(Config.withDefault(false));
    const debug_level = yield* Config.literal(
      "info",
      "warn",
      "error",
      "debug",
      "all"
    )("DEBUG_LEVEL").pipe(Config.withDefault("info"));
    yield* clear_log_file;
    const format = (type: string, group: string, area: string, ...rest: any[]) =>
      `[${type}][${group}] ${area} ${rest.join(" ")}`;

    const is_debug_level = (...levels: [typeof debug_level, ...(typeof debug_level)[]]) => levels.includes(debug_level);

    return {
      withGroup: (group: string) => ({
        info: (area: string, ...rest: any[]) =>
          with_debug && is_debug_level("info", "all")
            ? Effect.logInfo(format("info", group, area, ...rest))
            : Effect.void,
        warn: (area: string, ...rest: any[]) =>
          with_debug && is_debug_level("warn", "all")
            ? Effect.logWarning(format("warn", group, area, ...rest))
            : Effect.void,
        error: (area: string, ...rest: any[]) =>
          with_debug && is_debug_level("error", "all")
            ? Effect.logError(format("error", group, area, ...rest))
            : Effect.void,
        debug: (area: string, ...rest: any[]) =>
          with_debug && is_debug_level("debug", "all")
            ? Effect.logDebug(format("debug", group, area, ...rest))
            : Effect.void,
      }),
    };
  }),
  dependencies: [BunFileSystem.layer],
}) {}

export const BaseLoggerLive = BaseLoggerService.Default;

export const json_logger = Logger.jsonLogger.pipe(PlatformLogger.toFile("log.jsonl"));
