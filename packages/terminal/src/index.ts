import { BunContext, BunFileSystem, BunRuntime } from "@effect/platform-bun";
import { GitLive } from "@p0/core/src/git";
import { BaseLoggerLive, json_logger } from "@p0/core/src/logger";
import { AppStateLive, TerminalProgram } from "@p0/core/src/terminal";
import { Effect, Layer, Logger } from "effect";

export const terminal_launcher = (...args: Parameters<typeof TerminalProgram>) =>
  BunRuntime.runMain(
    Effect.scoped(TerminalProgram(...args))
      //
      .pipe(
        Effect.provide(GitLive),
        Effect.provide(AppStateLive),
        Effect.provide(BaseLoggerLive),
        Effect.provide(BunContext.layer),
        Effect.provide(Logger.replaceScoped(Logger.defaultLogger, json_logger).pipe(Layer.provide(BunFileSystem.layer)))
      )
  );
