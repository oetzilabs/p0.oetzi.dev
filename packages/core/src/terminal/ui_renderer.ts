import { Effect, Option, SubscriptionRef } from "effect";
import { TERMINAL_ACTIONS } from "./actions";
import { AppStateService, type AppState } from "./app_state";

interface LayoutConfig {
  sidebarWidthPercent: number;
  errorWidthPercent: number;
}

const defaultLayoutConfig: LayoutConfig = {
  sidebarWidthPercent: 20,
  errorWidthPercent: 20,
};

/**
 * Calculates the width of a panel based on a percentage of the total width.
 *
 * @param totalWidth - The total width of the terminal.
 * @param percentage - The percentage of the total width to use for the panel.
 * @returns The calculated width of the panel.
 */
const calculatePanelWidth = (totalWidth: number, percentage: number): number => {
  return Math.floor((percentage / 100) * totalWidth);
};

/**
 * Builds the content for the sidebar based on the application state.
 *
 * @param state - The application state.
 * @returns The sidebar content as a string.
 */
const buildSidebarContent = (state: AppState, maxLength: number = process.stdout.columns - 2): string => {
  // split by projects and processes
  if (Option.isNone(state.selectedProcessId)) {
    const projects = state.projects.map((p) => p.name).join("\n");
    const processes = state.processes.map((p) => p.name).join("\n");
    // return projects and processes joined by a border
    return `Projects:\n${projects}\n${createBorder(maxLength)}\nProcesses:\n${processes}`;
  } else {
    // return projects and processes joined by a border, but highlight the selected process/project with a star
    const sPid = state.selectedProcessId.value;

    const highlight_process = (name: string, pid: number) => {
      if (pid === sPid) {
        return `${name} *`;
      }
      return name;
    };

    const projects = state.projects.map((p) => p.name).join("\n");
    const processes = state.processes.map((p) => highlight_process(p.name, p.id)).join("\n");

    return `Projects:\n${projects}\n${createBorder(maxLength)}\nProcesses:\n${processes}\n`;

    // return wrapTextToMaxLength(
    //   state.projects
    //     .map((pj) => {
    //       const process = state.processes.find((p) => p.name === pj.name);
    //       if (!process) return pj.name;
    //       return getProcessName(process, state.selectedProcessId);
    //     })
    //     .join("\n"),
    //   maxLength
    // );
  }
};

/**
 * Builds the content for the output panel based on the application state.
 *
 * @param state - The application state.
 * @returns The output content as a string.
 */
const buildOutputContent = (state: AppState, maxLength = process.stdout.columns - 2): string => {
  if (state.processes.length === 0) {
    return "No processes running.";
  }

  if (Option.isNone(state.selectedProcessId)) {
    if (state.processes.length > 0) {
      const process = state.processes[0];
      if (process) {
        return `PID: none\n${wrapTextToMaxLength(process.output, maxLength)}`;
      }
    }
    return "No processes running."; // Or some other default message
  } else {
    const selectedProcessId = state.selectedProcessId.value;
    const process = state.processes.find((p) => p.id === selectedProcessId);
    if (process) {
      return `PID: ${selectedProcessId}\n${wrapTextToMaxLength(process.output, maxLength)}`;
    } else {
      return "Process not found.";
    }
  }
};

/**
 * Wraps the text into multiple lines based on a specified maximum line length.
 *
 * @param text - The text to wrap into multiple lines.
 * @param maxLineLength - The maximum number of characters per line.
 * @returns The wrapped text with new lines.
 */
const wrapTextToMaxLength = (text: string, maxLineLength: number): string => {
  const lines: string[] = [];

  // Split the text by lines first
  text.split("\n").forEach((line) => {
    // Split each line into chunks of maxLineLength
    for (let i = 0; i < line.length; i += maxLineLength) {
      lines.push(line.slice(i, i + maxLineLength));
    }
  });

  return lines.join("\n");
};

/**
 * Builds the content for the errors panel based on the application state.
 *
 * @param state - The application state.
 * @returns The errors content as a string.
 */
const buildErrorsContent = (state: AppState, maxLength = process.stdout.columns - 2): string => {
  return state.processes
    .map((p) => wrapTextToMaxLength(`[${p.id}]: ${p.errors}`, maxLength))
    .filter((e) => e.length > 0)
    .join("\n");
};

/**
 * Creates a horizontal border string.
 *
 * @param width - The width of the border.
 * @returns The border string.
 */
const createBorder = (width: number): string => {
  return "━".repeat(width);
};

/**
 * Builds the layout string for the application UI.
 *
 * @param state - The application state.
 * @param config - The layout configuration.
 * @returns The layout string.
 */
const buildLayoutString = (state: AppState, config: LayoutConfig = defaultLayoutConfig): string => {
  const totalWidth = process.stdout.columns;
  const terminalHeight = process.stdout.rows - 3;

  if (state.running === false) {
    // TODO: Here I want to render a screen that shows the processes that were running before the program was terminated.
    // Somoething like: `Ending Processes: 1, 2, 3`
    // This has to be in the exact middle of the screen. We are going to use the full width AND height of the screen.
    const text = "Ending Processes:";
    const padding_x = Math.floor((totalWidth - text.length) / 2) - 1;
    const padding_y = Math.floor(terminalHeight / 2) - state.processes.length;
    let layout = `┏${createBorder(totalWidth - 2)}┓\n`;
    const padding_empty_line = `┃${" ".repeat(totalWidth - 2)}┃\n`;
    for (let i = 0; i < padding_y; i++) {
      layout += padding_empty_line;
    }
    layout += `┃${createBorder(totalWidth - 2)}┃\n`;
    for (let i = 0; i < padding_y; i++) {
      layout += padding_empty_line;
    }
    layout += `┃${text.padStart(padding_x).padEnd(totalWidth - 2)}┃\n`;
    for (let i = 0; i < state.processes.length; i++) {
      const p = state.processes[i];
      if (!p) {
        continue;
      }
      const pad_x = Math.floor((totalWidth - p.name.length) / 2) - 1;
      layout += `┃${p.name.padStart(pad_x).padEnd(totalWidth - 2)}┃\n`;
    }
    for (let i = 0; i < padding_y; i++) {
      layout += padding_empty_line;
    }
    layout += `┗${createBorder(totalWidth - 2)}┛\n`;
    return layout;
  }

  const sidebarWidth = calculatePanelWidth(totalWidth, config.sidebarWidthPercent);
  const errorWidth = calculatePanelWidth(totalWidth, config.errorWidthPercent);
  const outputWidth = totalWidth - (sidebarWidth + errorWidth + 4); // +4 for borders

  const sidebarContent = buildSidebarContent(state, sidebarWidth);
  const outputContent = buildOutputContent(state, outputWidth);
  const errorsContent = buildErrorsContent(state, errorWidth);

  const sidebarLines = sidebarContent.split("\n");
  const outputLines = outputContent.split("\n");
  const errorLines = errorsContent.split("\n");

  const contentHeight = Math.max(sidebarLines.length, outputLines.length, errorLines.length, terminalHeight);

  const sidebarBorder = createBorder(sidebarWidth);
  const outputBorder = createBorder(outputWidth);
  const errorBorder = createBorder(errorWidth);

  let layout = "";

  layout += `┏${sidebarBorder}┳${outputBorder}┳${errorBorder}┓\n`;

  for (let i = 0; i < contentHeight; i++) {
    const sidebarLine = sidebarLines[i] || "".padEnd(sidebarWidth);
    const outputLine = outputLines[i] || "".padEnd(outputWidth);
    const errorLine = errorLines[i] || "".padEnd(errorWidth);

    layout += `┃${sidebarLine.padEnd(sidebarWidth)}┃${outputLine.padEnd(outputWidth)}┃${errorLine.padEnd(
      errorWidth
    )}┃\n`;
  }

  layout += `┗${sidebarBorder}┻${outputBorder}┻${errorBorder}┛\n`;

  return layout;
};

export class UIRendererService extends Effect.Service<UIRendererService>()("@p0/core/terminal/ui_renderer", {
  effect: Effect.gen(function* (_) {
    const appState = yield* _(AppStateService);

    const last_rendererd = yield* _(SubscriptionRef.make(""));

    const clear = Effect.sync(() => process.stdout.write(TERMINAL_ACTIONS.CLEAR));

    const render = (layout: string) =>
      Effect.gen(function* (_) {
        const lr = yield* _(SubscriptionRef.get(last_rendererd));
        if (layout !== lr) {
          process.stdout.write(TERMINAL_ACTIONS.CLEAR);
          process.stdout.write(TERMINAL_ACTIONS.CURSOR_HOME);
          process.stdout.write(layout);
          yield* _(SubscriptionRef.update(last_rendererd, () => layout));
        }
      });

    const build_layout = Effect.gen(function* (_) {
      const state = yield* _(appState.getState);
      return buildLayoutString(state);
    });

    return {
      clear,
      render,
      build_layout,
    };
  }),
  dependencies: [],
}) {}

export const UIRendererLive = UIRendererService.Default;
