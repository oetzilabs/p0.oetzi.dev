import { Command } from "@effect/platform";
import { Config, Effect } from "effect";
import { run_command_withLogger } from "../../../utils";
import { BaseLoggerLive, BaseLoggerService } from "../../../logger";

export class TerminalRepository extends Effect.Service<TerminalRepository>()("@p0/core/terminal/repo", {
  effect: Effect.gen(function* (_) {
    const base_logger = yield* _(BaseLoggerService);
    const logger = base_logger.withGroup("terminal");
    const separator = process.platform === "win32" ? ";" : ":";
    const PathConfig = yield* Config.string("PATH").pipe(Config.withDefault(""));
    const PATH = PathConfig.split(separator)
      .filter((p) => !p.includes(" "))
      .join(separator);
    const env = Command.env({
      PATH,
    });

    const execute = (command: Command.Command) =>
      Effect.gen(function* (_) {
        return yield* run_command_withLogger(command.pipe(env), "execute", logger);
      });

    return {
      execute,
    } as const;
  }),
  dependencies: [BaseLoggerLive],
}) {}
