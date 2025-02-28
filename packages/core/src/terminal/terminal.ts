import { Duration, Effect } from "effect";
import { BaseLoggerLive, BaseLoggerService } from "../logger";
import { type Project } from "../projects";
import { ProjectManagerService, ProjectManagerLive } from "../projects/manager";
import { AppStateService } from "./app_state";
import { InputHandlerLive, InputHandlerService } from "./input_handler";
import { ProcessManagerLive } from "./process_manager";
import { UIRendererLive, UIRendererService } from "./ui_renderer";

export class TerminalService extends Effect.Service<TerminalService>()("@p0/core/terminal/repo", {
  effect: Effect.gen(function* (_) {
    const appState = yield* _(AppStateService);
    const inputHandler = yield* _(InputHandlerService);

    const runTUI = Effect.async((resume) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      process.stdin.on("data", (chunk) => {
        const key = chunk.toString();
        // console.log("key", key);
        if (key) {
          // Run the handleInput effect and handle any potential errors
          Effect.runPromise(inputHandler.handleInput(key));
        }
      });

      return Effect.sync(() => {
        process.stdin.removeAllListeners("data");
        process.stdin.setRawMode(false);
        process.stdin.pause();
      });
    });

    const peak = Effect.gen(function* (_) {
      const state = yield* _(appState.getState);
      return state.processes;
    });

    const is_running = Effect.gen(function* (_) {
      const state = yield* _(appState.getState);
      return state.running;
    });

    return {
      runTUI,
      peak,
      is_running,
    } as const;
  }),
  dependencies: [BaseLoggerLive],
}) {}

const TerminalLive = TerminalService.Default;

export type TerminalProgramInput = {
  projects: Effect.Effect<Project>[];
  name: string;
};

export const TerminalProgram = (input: TerminalProgramInput) =>
  Effect.gen(function* (_) {
    const base_logger = yield* _(BaseLoggerService);
    const logger = base_logger.withGroup("terminal_program");

    const terminal = yield* _(TerminalService);
    const app_state = yield* _(AppStateService);
    const ui_renderer = yield* _(UIRendererService);
    const pm = yield* _(ProjectManagerService);

    yield* logger.info("unknown", "Starting TUI loop");
    const list_pjs = Effect.gen(function* (_) {
      const pjs: Project[] = [];
      for (const pj of input.projects) {
        const p = yield* _(pj);
        pjs.push(yield* _(pj));
      }
      return pjs;
    });
    yield* Effect.flatMap(list_pjs, (ps) =>
      Effect.forEach(
        ps.filter((p) => p.start_automatically ?? false),
        (project) => pm.launch(project)
      )
    );
    yield* logger.info("launch_project", "Launched projects");

    yield* Effect.flatMap(list_pjs, (ps) =>
      Effect.forEach(
        ps.filter((p) => !(p.start_automatically ?? false)),
        (project) => pm.register(project)
      )
    );
    yield* logger.info("register_project", "Registered projects");

    yield* _(Effect.forkDaemon(terminal.runTUI));
    yield* logger.info("run_tui", "Starting TUI loop");

    let is_running = true;
    const looper = Effect.loop(undefined, {
      while: () => is_running,
      body: (b) =>
        Effect.gen(function* (_) {
          is_running = yield* terminal.is_running;
          const layout = yield* ui_renderer.build_layout;
          yield* ui_renderer.render(layout);
          yield* Effect.sleep(Duration.millis(1000 / 60));
        }),
      step: () => undefined,
    });

    yield* _(Effect.forkDaemon(looper));
    yield* logger.info("looper", "Starting looper");

    yield* Effect.loop(undefined, {
      while: () => true,
      body: (b) =>
        Effect.gen(function* (_) {
          is_running = yield* terminal.is_running;
          if (!is_running) {
            const ps = yield* terminal.peak;
            yield* Effect.forEach(ps, (p) => p.kill("SIGTERM"));

            yield* logger.warn("kill", "Terminating processes");
            process.stdin.setRawMode(false);
            process.stdout.write("\x1b[2J");
            process.stdout.write("\x1b[0;0H");
            yield* logger.info("exit", "Exiting");
            process.exit(0);
          }
          yield* _(Effect.sleep(Duration.millis(10)));
        }),
      step: () => undefined,
    }).pipe(
      Effect.catchTags({
        // ExitError: () => Effect.succeed(undefined),
      })
    );
  }).pipe(
    Effect.provide(TerminalLive),
    Effect.provide(UIRendererLive),
    Effect.provide(InputHandlerLive),
    Effect.provide(ProjectManagerLive),
    Effect.provide(BaseLoggerLive)
  );
