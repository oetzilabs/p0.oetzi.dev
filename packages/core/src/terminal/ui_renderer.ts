import { Data, Effect, Option, Schema, SubscriptionRef } from "effect";
import { AppStateService, type AppState } from "./app_state";
import { TERMINAL_ACTIONS } from "./actions";

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
 * Retrieves the name of a process, optionally marking it as selected.
 *
 * @param process - The process object.
 * @param selectedProcessId - The ID of the currently selected process.
 * @returns The process name, optionally with a "*" suffix if selected.
 */
const getProcessName = (process: { id: number; name: string }, selectedProcessId: Option.Option<number>): string => {
  const isSelected = Option.isSome(selectedProcessId) && selectedProcessId.value === process.id;
  return process.name + (isSelected ? " *" : "");
};

/**
 * Builds the content for the sidebar based on the application state.
 *
 * @param state - The application state.
 * @returns The sidebar content as a string.
 */
const buildSidebarContent = (state: AppState): string => {
  if (Option.isNone(state.selectedProcessId)) {
    return state.processes.map((p) => p.name).join("\n");
  } else {
    return state.projects
      .map((pj) => {
        const process = state.processes.find((p) => p.name === pj.name);
        if (!process) return pj.name;
        return getProcessName(process, state.selectedProcessId);
      })
      .join("\n");
  }
};

/**
 * Builds the content for the output panel based on the application state.
 *
 * @param state - The application state.
 * @returns The output content as a string.
 */
const buildOutputContent = (state: AppState): string => {
  if (state.processes.length === 0) {
    return "No processes running.";
  }

  if (Option.isNone(state.selectedProcessId)) {
    if (state.processes.length > 0) {
      const process = state.processes[0];
      if (process) {
        return `PID: none\n${process.output}`;
      }
    }
    return "No processes running."; // Or some other default message
  } else {
    const selectedProcessId = state.selectedProcessId.value;
    const process = state.processes.find((p) => p.id === selectedProcessId);
    if (process) {
      return `PID: ${selectedProcessId}\n${process.output}`;
    } else {
      return "Process not found.";
    }
  }
};

/**
 * Builds the content for the errors panel based on the application state.
 *
 * @param state - The application state.
 * @returns The errors content as a string.
 */
const buildErrorsContent = (state: AppState): string => {
  return state.processes
    .map((p) => `[${p.id}]: ${p.errors}`)
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
      const { name: pname } = state.processes[i];
      const pad_x = Math.floor((totalWidth - pname.length) / 2) - 1;
      layout += `┃${pname.padStart(pad_x).padEnd(totalWidth - 2)}┃\n`;
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

  const sidebarContent = buildSidebarContent(state);
  const outputContent = buildOutputContent(state);
  const errorsContent = buildErrorsContent(state);

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
