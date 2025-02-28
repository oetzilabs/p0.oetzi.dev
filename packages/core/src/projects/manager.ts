import { Path, Command } from "@effect/platform";
import { Effect, SubscriptionRef, MutableList, Equal, Stream, pipe, Option, String } from "effect";
import { ProjectStatus, type Project, type ProjectStatusEnum } from ".";
import { BaseLoggerService } from "../logger";
import { AppStateService, ProcessManagerLive, ProcessManagerService } from "../terminal";

export class ProjectManagerService extends Effect.Service<ProjectManagerService>()(
  "@p0/core/terminal/process_manager",
  {
    effect: Effect.gen(function* (_) {
      const app_state = yield* _(AppStateService);
      const base_logger = yield* _(BaseLoggerService);
      const pm = yield* _(ProcessManagerService);
      const logger = base_logger.withGroup("project_manager");
      const cwd = process.cwd();
      const path = yield* _(Path.Path);

      const projects = yield* _(SubscriptionRef.make<Record<string, Project>>({}));

      const launch = (project: Project) =>
        Effect.gen(function* (_) {
          const s = yield* SubscriptionRef.get<ProjectStatusEnum>(project.status);
          if (ProjectStatus.$is("Running")(s)) {
            return yield* Effect.void;
          }
          let project_path = project.path ?? "";
          let working_directory = path.join(cwd, project_path);
          let _command = ["bun", "run", `${working_directory}/index.ts`] as [string, ...string[]];
          if (project.command !== undefined) {
            if (typeof project.command === "string") {
              _command = project.command.split(" ") as [string, ...string[]];
            } else if (Array.isArray(project.command)) {
              _command = project.command;
            }
          }

          const com = Command.make(..._command).pipe(Command.workingDirectory(working_directory));

          const _process = yield* pipe(
            // Start running the command and return a handle to the running process
            Command.start(com),
            Effect.flatMap((_process) => {
              // Capture the stream and update the state
              return Effect.gen(function* () {
                const stdoutStream = _process.stdout.pipe(Stream.decodeText("utf8"));
                const stderrStream = _process.stderr.pipe(Stream.decodeText("utf8"));

                yield* _(
                  app_state.updateState((state) => ({
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
                      app_state.updateState((state) => {
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
                      app_state.updateState((state) => {
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
          // yield* snapshot(project);
        });

      const register = (project: Project) =>
        Effect.gen(function* (_) {
          const s = yield* SubscriptionRef.get<ProjectStatusEnum>(project.status);
          if (ProjectStatus.$is("Registered")(s)) {
            return yield* Effect.void;
          }
          yield* _(SubscriptionRef.update(project.status, () => ProjectStatus.Registered()));
          yield* _(
            app_state.updateState((state) => ({
              ...state,
              projects: [...state.projects, project],
            }))
          );
          const projectId = project.id;
          yield* _(
            SubscriptionRef.update(projects, (currentProjects) => ({
              ...currentProjects,
              [projectId]: project,
            }))
          );
          yield* logger.info("register_project", "project", project.name);
          // set status to registered
          // yield* snapshot(project);
          return projectId;
        });

      const getProjects = Effect.sync(() => SubscriptionRef.get(projects));

      return {
        launch,
        register,
        getProjects,
      };
    }),
    dependencies: [ProcessManagerLive],
  }
) {}

export const ProjectManagerLive = ProjectManagerService.Default;
