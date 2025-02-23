import { Command, Path } from "@effect/platform";
import { Effect, Option, Stream, pipe } from "effect";
import { BaseLoggerService } from "../logger";
import { AppStateService, type Project } from "./app_state";

export class ProcessManagerService extends Effect.Service<ProcessManagerService>()(
  "@p0/core/terminal/process_manager",
  {
    effect: Effect.gen(function* (_) {
      const appState = yield* _(AppStateService);
      const base_logger = yield* _(BaseLoggerService);
      const logger = base_logger.withGroup("process_manager");
      const cwd = process.cwd();
      const path = yield* _(Path.Path);

      const trackProject = (project: Project) =>
        Effect.gen(function* (_) {
          let _command = ["bun", "run", `${path.join(cwd, project.path)}/index.ts`] as [string, ...string[]];
          if (typeof project.command === "string") {
            _command = project.command.split(" ") as [string, ...string[]];
          } else if (Array.isArray(project.command)) {
            _command = project.command;
          }

          const com = Command.make(..._command);

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
                        name: project.name,
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
                        if (processIndex === -1) return state;

                        const updatedProcesses = [...state.processes];
                        updatedProcesses[processIndex] = {
                          ...updatedProcesses[processIndex],
                          output: updatedProcesses[processIndex].output + line + "\n",
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
                          ...updatedProcesses[processIndex],
                          errors: updatedProcesses[processIndex].errors + line + "\n",
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

      const launchProject = (project: Project) =>
        Effect.gen(function* (_) {
          const state = yield* _(appState.getState);
          const _project = state.projects.find((p) => p.name === project.name);
          if (_project) {
            return;
          }

          yield* trackProject(project);
          yield* logger.info("launch_project", "project", project.name);
        });

      const registerProject = (project: Project) =>
        Effect.gen(function* (_) {
          yield* _(
            appState.updateState((state) => ({
              ...state,
              projects: [...state.projects, project],
            }))
          );
          yield* logger.info("register_project", "project", project.name);
        });

      return {
        trackProject,
        launchProject,
        registerProject,
      };
    }),
    dependencies: [],
  }
) {}

export const ProcessManagerLive = ProcessManagerService.Default;
