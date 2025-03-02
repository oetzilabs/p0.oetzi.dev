import { Config, Effect, Layer, Logger } from "effect";
import { FileSystem, Path, PlatformLogger } from "@effect/platform";
import { BunFileSystem } from "@effect/platform-bun";

export class BaseLoggerService extends Effect.Service<BaseLoggerService>()("@p0/core/logger/base_logger", {
  effect: Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem);
    const path = yield* _(Path.Path);
    const cwd = process.cwd();
    const log_file = path.join(cwd, path.join("log.jsonl"));
    const with_debug = yield* Config.boolean("DEBUG").pipe(Config.withDefault(false));

    const debug_level = yield* Config.literal(
      "info",
      "warn",
      "error",
      "debug",
      "all"
    )("DEBUG_LEVEL").pipe(Config.withDefault("all"));

    const writeLog = (message: string) =>
      Effect.gen(function* (_) {
        yield* fs.writeFileString(log_file, message + "\n", { flag: "a+" });
      });

    yield* fs.writeFileString(log_file, "");

    const format = (type: typeof debug_level, group: string, area: string, ...rest: any[]) =>
      `[${Date.now()}][${type}][${group}] ${area} ${rest.join(" ")}`;

    const is_debug_level = (...levels: [typeof debug_level, ...(typeof debug_level)[]]) =>
      levels.some((l) => l.toLowerCase() === debug_level.toLowerCase());

    const log =
      (type: typeof debug_level, group: string) =>
      (area: string, ...rest: any[]) =>
        with_debug && is_debug_level(type, "all") ? writeLog(format(type, group, area, ...rest)) : Effect.void;

    return {
      withGroup: (group: string) => ({
        info: log("info", group),
        warn: log("warn", group),
        error: log("error", group),
        debug: log("debug", group),
      }),
    };
  }),
  dependencies: [BunFileSystem.layer],
}) {}

export const BaseLoggerLive = BaseLoggerService.Default;

export const json_logger = Logger.jsonLogger.pipe(PlatformLogger.toFile("log.jsonl"));
