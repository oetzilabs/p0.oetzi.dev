import { Command, Path } from "@effect/platform";
import { Effect, Option, Stream, pipe } from "effect";
import { BaseLoggerService } from "../logger";
import { AppStateService } from "./app_state";

export type ProcessCommand = {
  name: string;
  command: [string, ...string[]] | string;
  path: string;
  dev?: boolean | undefined;
  environment?: Parameters<typeof Command.env>[1];
};

export class ProcessManagerService extends Effect.Service<ProcessManagerService>()(
  "@p0/core/terminal/process_manager",
  {
    effect: Effect.gen(function* (_) {
      const appState = yield* _(AppStateService);
      const base_logger = yield* _(BaseLoggerService);
      const logger = base_logger.withGroup("process_manager");
      const cwd = process.cwd();
      const path = yield* _(Path.Path);

      const trackCommand = (command: ProcessCommand) =>
        Effect.gen(function* (_) {
          let pp = command.path ?? "";
          let working_directory = path.join(cwd, pp);
          let _command = ["bun", "run", `${working_directory}/index.ts`] as [string, ...string[]];
          if (command.command !== undefined) {
            if (typeof command.command === "string") {
              _command = command.command.split(" ") as [string, ...string[]];
            } else if (Array.isArray(command.command)) {
              _command = command.command;
            }
          }

          const environment = command.environment ?? {};
          yield* logger.info("environment", JSON.stringify(environment));

          const com = Command.make(..._command).pipe(
            Command.workingDirectory(working_directory),
            Command.env(environment)
          );

          const _process = yield* pipe(
            // Start running the command and return a handle to the running process
            Command.start(com),
            Effect.flatMap((_process) => {
              // Capture the stream and update the state
              return Effect.gen(function* () {
                const stdoutStream = _process.stdout.pipe(Stream.decodeText("utf8"));
                const stderrStream = _process.stderr.pipe(Stream.decodeText("utf8"));

                yield* _(
                  appState.updateState((state) => ({
                    ...state,
                    processes: [
                      ...state.processes,
                      {
                        id: _process.pid,
                        name: command.name,
                        status: "running",
                        kill: _process.kill,
                        stdout: stdoutStream,
                        stderr: stderrStream,
                        errors: "",
                        output: "",
                        started_at: Date.now(),
                        updated_at: Option.none(),
                        killed_at: Option.none(),
                      },
                    ],
                    selectedProcessId: Option.some(_process.pid),
                  }))
                );

                // Accumulate output from stdout
                yield* _(
                  stdoutStream.pipe(
                    Stream.runForEach((line) =>
                      appState.updateState((state) => {
                        const processIndex = state.processes.findIndex((p) => p.id === _process.pid);
                        if (!processIndex) return state;
                        if (processIndex === -1) return state;

                        const updatedProcesses = [...state.processes];
                        updatedProcesses[processIndex] = {
                          ...updatedProcesses[processIndex]!,
                          output: updatedProcesses[processIndex]!.output + line + "\n",
                        };

                        return { ...state, processes: updatedProcesses };
                      })
                    )
                  ),
                  Effect.fork
                );

                // Accumulate output from stderr
                yield* _(
                  stderrStream.pipe(
                    Stream.runForEach((line) =>
                      appState.updateState((state) => {
                        const processIndex = state.processes.findIndex((p) => p.id === _process.pid);
                        if (processIndex === -1) return state;

                        const updatedProcesses = [...state.processes];
                        updatedProcesses[processIndex] = {
                          ...updatedProcesses[processIndex]!,
                          errors: updatedProcesses[processIndex]!.errors + line + "\n",
                        };

                        return { ...state, processes: updatedProcesses };
                      })
                    )
                  ),
                  Effect.fork
                );

                return _process;
              });
            })
          );
          yield* logger.info("track_project", "pid", _process.pid);
        });

      const launchCommand = (command: ProcessCommand) =>
        Effect.gen(function* (_) {
          const state = yield* _(appState.getState);
          const _project = state.projects.find((p) => p.name === command.name);
          if (_project) {
            return;
          }

          yield* trackCommand(command);
          yield* logger.info("launch_project", "project", command.name);
        });

      return {
        trackCommand,
        launchCommand,
      };
    }),
    dependencies: [],
  }
) {}

export const ProcessManagerLive = ProcessManagerService.Default;
