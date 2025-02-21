import { Command, Path } from "@effect/platform";
import type { ProcessId } from "@effect/platform/CommandExecutor";
import { Effect, Ref, Stream, Match, Layer, Duration, Console, pipe, Option } from "effect";

const ProcessStatus = {
  running: "running",
  stopped: "stopped",
  daemon: "daemon",
} as const;

interface Process {
  id: ProcessId;
  name: string;
  status: (typeof ProcessStatus)[keyof typeof ProcessStatus];
}

const FocusableComponents = {
  sidebar: "sidebar",
  output: "output",
  errors: "errors",
} as const;

export type Project = {
  name: string;
  path: string;
  dev?: boolean | undefined;
  command?: [string, ...string[]] | string;
};

interface AppState {
  projects: Project[];
  processes: Process[];
  selectedProcessId: Option.Option<ProcessId>;
  output: string;
  errors: { timestamp: Date; message: string }[];
  searchQuery: string;
  showHelp: boolean;
  focusedComponent: (typeof FocusableComponents)[keyof typeof FocusableComponents];
}

export class Terminal extends Effect.Service<Terminal>()("@p0/core/terminal/repo", {
  effect: Effect.gen(function* (_) {
    const initialState: AppState = {
      projects: [],
      processes: [],
      selectedProcessId: Option.none(),
      output: "",
      errors: [],
      searchQuery: "",
      showHelp: false,
      focusedComponent: "sidebar",
    };
    const state_ref = yield* _(Ref.make(initialState));

    const started_at = Date.now();

    const currentContentRef = yield* _(Ref.make(`Starting at ${new Date(started_at).toLocaleTimeString()}`));

    const update = (content: string) => Ref.update(currentContentRef, () => content);

    const render = () =>
      Effect.gen(function* (_) {
        const content = yield* Ref.get(currentContentRef);
        process.stdout.write("\x1b[2J"); // Clear screen
        process.stdout.write("\x1b[0;0H"); // Move cursor to top-left
        process.stdout.write(content);
      });

    const read = () =>
      Effect.async((resume) => {
        process.stdin.on("data", (data) => {
          resume(Effect.succeed(data.toString()));
        });
      });

    const clear = () => Effect.sync(() => process.stdout.write("\x1b[2J"));

    const build_layout = Effect.gen(function* (_) {
      const state = yield* Ref.get(state_ref);
      const sidebarWidth = 20;
      const outputWidth = 60;
      const errorWidth = 20;
      const selected = state.selectedProcessId;

      // Build Sidebar Content
      let sidebarContent = "";
      if (Option.isNone(selected)) {
        sidebarContent = state.processes.map((p) => p.name).join("\n");
      } else {
        const sId = yield* state.selectedProcessId;
        sidebarContent = state.processes.map((p) => p.name + (sId === p.id ? " *" : "")).join("\n");
      }

      // Build Output Content
      const outputContent = state.output;

      // Build Errors Content
      const errorsContent = state.errors.map((e) => `${e.timestamp.toLocaleTimeString()} ${e.message}`).join("\n");

      // Create Borders
      const sidebarBorder = "=".repeat(sidebarWidth);
      const outputBorder = "=".repeat(outputWidth);
      const errorBorder = "=".repeat(errorWidth);

      const sidebarLines = sidebarContent.split("\n");
      const outputLines = outputContent.split("\n");
      const errorLines = errorsContent.split("\n");

      const maxLines = Math.max(sidebarLines.length, outputLines.length, errorLines.length);

      let layout = "";

      // Add Borders to the layout
      layout += `|${sidebarBorder}|${outputBorder}|${errorBorder}|\n`;

      for (let i = 0; i < maxLines; i++) {
        const sidebarLine = sidebarLines[i] || "".padEnd(sidebarWidth);
        const outputLine = outputLines[i] || "".padEnd(outputWidth);
        const errorLine = errorLines[i] || "".padEnd(errorWidth);

        layout += `|${sidebarLine.padEnd(sidebarWidth)}|${outputLine.padEnd(outputWidth)}|${errorLine.padEnd(
          errorWidth
        )}|\n`;
      }
      layout += `|${sidebarBorder}|${outputBorder}|${errorBorder}|\n`;

      return layout;
    });

    const handleInput = (key: string) =>
      Effect.gen(function* (_) {
        return yield* Ref.update(state_ref, (state) => {
          return Match.value(key).pipe(
            // quit the program
            Match.when("q", () => {
              process.exit(0);
              return state; // Unreachable, but needed for type checking
            }), // refresh the screen
            Match.when("r", () => {
              return state;
            }),
            // down
            Match.when("k", () => {
              if (state.processes.length === 0) return state;

              const currentIndex = state.processes.findIndex((p) =>
                Option.exists(state.selectedProcessId, (id) => id === p.id)
              );

              const newIndex = Math.max(0, currentIndex - 1);
              const newSelectedProcess = state.processes[newIndex];

              return {
                ...state,
                selectedProcessId: newSelectedProcess
                  ? Option.some(newSelectedProcess.id)
                  : state.processes.length > 0
                  ? Option.some(state.processes[0].id)
                  : Option.none(),
              };
            }),
            // up
            Match.when("j", () => {
              if (state.processes.length === 0) return state;

              const currentIndex = state.processes.findIndex((p) =>
                Option.exists(state.selectedProcessId, (id) => id === p.id)
              );
              const newIndex = Math.min(state.processes.length - 1, currentIndex + 1);
              const newSelectedProcess = state.processes[newIndex];

              return {
                ...state,
                selectedProcessId: newSelectedProcess
                  ? Option.some(newSelectedProcess.id)
                  : state.processes.length > 0
                  ? Option.some(state.processes[0].id)
                  : Option.none(),
              };
            }),
            Match.when("h", () => ({
              ...state,
              focusedComponent:
                state.focusedComponent === FocusableComponents.output
                  ? FocusableComponents.sidebar
                  : state.focusedComponent === FocusableComponents.errors
                  ? FocusableComponents.output
                  : FocusableComponents.sidebar,
            })),
            Match.when("l", () => ({
              ...state,
              focusedComponent:
                state.focusedComponent === FocusableComponents.sidebar
                  ? FocusableComponents.output
                  : state.focusedComponent === FocusableComponents.output
                  ? FocusableComponents.errors
                  : FocusableComponents.output,
            })),
            Match.when("?", () => ({ ...state, showHelp: !state.showHelp })),
            Match.orElse((input) => state)
          );
        });
      });

    const runTUI = Effect.async((resume) => {
      process.stdin.setRawMode(true); // Enable raw mode for keypress events
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      process.stdin.on("data", (chunk) => {
        const key = chunk.toString(); // Convert input to Key object
        if (key) {
          Effect.runPromise(handleInput(key));
        }
      });

      // Keep the effect running
      return Effect.sync(() => {
        // Clean up on exit (optional)
        process.stdin.removeAllListeners("data");
        process.stdin.setRawMode(false);
        process.stdin.pause();
      });
    });

    const setState = (state: AppState) => Ref.set(state_ref, state);

    const track_project = (project: Project) =>
      Effect.gen(function* (_) {
        const cwd = process.cwd();
        const path = yield* _(Path.Path);
        let _command = ["bun", "run", `${path.join(cwd, project.path)}/index.ts`] as [string, ...string[]];
        if (typeof project.command === "string") {
          _command = project.command.split(" ") as [string, ...string[]];
        } else if (Array.isArray(project.command)) {
          _command = project.command;
        }

        const com = Command.make(..._command);
        const stream = Command.streamLines(com, "utf8");
        stream.pipe(Stream.flatMap((line) => Effect.sync(() => console.log(line))));

        // Capture the stream and update the state
        yield* _(
          stream.pipe(
            Stream.runForEach((line) =>
              Ref.update(state_ref, (state) => ({
                ...state,
                output: state.output + line + "\n", // Append new line to existing output
              }))
            )
          ),
          Effect.fork
        ); // Run stream processing in the background

        yield* pipe(
          // Start running the command and return a handle to the running process
          Command.start(com),
          Effect.flatMap((process) =>
            Ref.update(state_ref, (state) => ({
              ...state,
              processes: [
                ...state.processes,
                {
                  id: process.pid,
                  name: project.name,
                  status: ProcessStatus.running,
                },
              ],
              selectedProcessId: Option.some(process.pid),
            }))
          )
        );
        yield* update(`Tracking Project ${project.name}`);
      });

    const launch_project = (project: Project) =>
      Effect.gen(function* (_) {
        const state = yield* _(Ref.get(state_ref));
        const _project = state.projects.find((p) => p.name === project.name);
        if (_project) {
          yield* update(`Project ${project.name} already running`);
          return;
        }

        yield* _(track_project(project));
      });

    const peak = Effect.gen(function* (_) {
      const state = yield* Ref.get(state_ref);
      return state.processes;
    });

    return {
      update,
      render,
      read,
      clear,
      build_layout,
      state_ref,
      runTUI,
      setState,
      launch_project,
      peak,
    } as const;
  }),
  dependencies: [], // Remove BunT.layer dependency
}) {}

export type TerminalProgramInput = {
  projects: Project[];
  name: string;
};

export const TerminalProgram = (input: TerminalProgramInput) =>
  Effect.gen(function* (_) {
    const terminal = yield* _(Terminal);
    yield* _(Effect.forkDaemon(terminal.runTUI)); // Run input handling in the background

    for (const project of input.projects) {
      yield* terminal.launch_project(project);
    }

    while (true) {
      const layout = yield* terminal.build_layout;
      yield* _(terminal.update(layout));
      yield* _(terminal.render());
      yield* _(Effect.sleep(Duration.millis(1000 / 60)));
    }
  }).pipe(Effect.provide(Terminal.Default));
