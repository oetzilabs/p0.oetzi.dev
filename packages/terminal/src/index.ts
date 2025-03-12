import { FileSystem, Path } from "@effect/platform";
import { BunContext, BunFileSystem, BunRuntime } from "@effect/platform-bun";
import { GitLive } from "@p0/core/src/git";
import { BaseLoggerLive, json_logger } from "@p0/core/src/logger";
import { AppStateLive, TerminalProgram } from "@p0/core/src/terminal";
import { Console, Effect, Layer, Logger, Match, Schema } from "effect";

const $launcher = (...args: Parameters<typeof TerminalProgram>) =>
  BunRuntime.runMain(
    Effect.scoped(TerminalProgram(...args)).pipe(
      Effect.provide(GitLive),
      Effect.provide(AppStateLive),
      Effect.provide(BaseLoggerLive),
      Effect.provide(BunContext.layer),
      Effect.provide(Logger.replaceScoped(Logger.defaultLogger, json_logger).pipe(Layer.provide(BunFileSystem.layer)))
    )
  );

class P0ConfigNotFound extends Schema.TaggedError<P0ConfigNotFound>()("P0ConfigNotFound", {}) {}

class P0ConfigCouldNotBeImported extends Schema.TaggedError<P0ConfigCouldNotBeImported>()(
  "P0ConfigCouldNotBeImported",
  {}
) {}

type SubCommandRecord<
  T extends Record<
    string,
    {
      keys: [string, ...string[]];
      description: string;
    }
  > = {}
> = Record<
  string,
  {
    keys: [string, ...string[]];
    description: string;
  }
> &
  T;

const subcommands: SubCommandRecord = {
  help: {
    keys: ["--help", "-h"],
    description: "Show this help message",
  },
  init: {
    keys: ["init"],
    description: "Initialize a new p0 project",
  },
};

const help_text = (commands: typeof subcommands) =>
  `Usage: p0 [subcommand]

Subcommands:
  ${Object.entries(commands)
    .map(([key, value]) => `  ${key} - ${value.description}`)
    .join("\n")}
    
If you are looking for the documentation, please visit https://github.com/oetzilabs/p0.oetzi.dev
If you have any issues or suggestions, please open an issue on https://github.com/oetzilabs/p0.oetzi.dev/issues
` as const;

export const $internal_launcher = () =>
  BunRuntime.runMain(
    Effect.scoped(
      Effect.gen(function* (_) {
        const cwd = process.cwd();
        const path = yield* _(Path.Path);
        const fs = yield* _(FileSystem.FileSystem);

        const args = process.argv.slice(2);

        const matcher = Match.value({ args }).pipe(
          Match.when({ args: (a) => a.some((x) => subcommands.help!.keys.includes(x)) }, () =>
            Effect.gen(function* () {
              // TODO: implement help
              yield* Console.log(help_text);
              return yield* Effect.void;
            })
          ),
          Match.when({ args: (a) => a.some((x) => subcommands.init!.keys.includes(x)) }, () =>
            Effect.gen(function* () {
              // TODO: implement init
              return yield* Effect.void;
            })
          ),
          Match.orElse(() =>
            Effect.gen(function* (_) {
              // check if there is a p0.config.ts file in the current directory where the user is running the command
              const config_file_exists = yield* fs.exists(path.join(cwd, "p0.config.ts"));
              if (!config_file_exists) {
                return yield* Effect.fail(P0ConfigNotFound);
              }
              const config_file = yield* Effect.tryPromise(() => import(path.join(cwd, "p0.config.ts")));
              if (!config_file) {
                return yield* Effect.fail(P0ConfigCouldNotBeImported);
              }
              const config = config_file.default as ReturnType<typeof $launcher>;
              return config;
            })
          )
        );
        return yield* matcher;
      })
    )
      .pipe(Effect.provide(BunContext.layer), Effect.provide(BunFileSystem.layer))
      .pipe(
        Effect.catchTags({
          P0ConfigCouldNotBeImported: () => Effect.logFatal("Could not import p0.config.ts"),
          P0ConfigNotFound: () => Effect.logFatal("Could not find p0.config.ts, please provide one."),
        })
      )
  );
export default $launcher;
