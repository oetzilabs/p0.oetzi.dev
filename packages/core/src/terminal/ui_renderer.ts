import { Data, Effect, Option, Schema, SubscriptionRef } from "effect";
import { AppStateService } from "./app_state";
import { TERMINAL_ACTIONS } from "./actions";

export class UIRendererService extends Effect.Service<UIRendererService>()("@p0/core/terminal/ui_renderer", {
  effect: Effect.gen(function* (_) {
    const appState = yield* _(AppStateService);

    const last_rendererd = yield* SubscriptionRef.make("");

    const clear = Effect.sync(() => process.stdout.write(TERMINAL_ACTIONS.CLEAR));

    const render = (layout: string) =>
      Effect.gen(function* (_) {
        const lr = yield* SubscriptionRef.get(last_rendererd);
        if (layout !== lr) {
          process.stdout.write(TERMINAL_ACTIONS.CLEAR);
          process.stdout.write(TERMINAL_ACTIONS.CURSOR_HOME);
          process.stdout.write(layout);
          yield* SubscriptionRef.update(last_rendererd, () => layout);
        }
      });

    const build_layout = Effect.gen(function* (_) {
      const state = yield* _(appState.getState);

      const sidebar_width_percent = 20; // Percentage of terminal width
      const error_width_percent = 20; // Percentage of terminal width

      const total_width = process.stdout.columns;
      const sidebar_width = Math.floor((sidebar_width_percent / 100) * total_width);
      const error_width = Math.floor((error_width_percent / 100) * total_width);
      const output_width = total_width - (sidebar_width + error_width + 4); // +4 for the borders

      const selected = state.selectedProcessId;

      // Build Sidebar Content
      let sidebar_content = "";
      if (Option.isNone(selected)) {
        sidebar_content = state.processes.map((p) => p.name).join("\n");
      } else {
        const sId = selected.value;
        sidebar_content = state.projects
          .map((pj) => {
            const _process = state.processes.find((p) => p.name === pj.name);
            if (!_process) return pj.name;
            return _process.name + (sId === _process.id ? " *" : "");
          })
          .join("\n");
      }

      // Build Output Content
      let output_content = "";
      if (state.processes.length === 0) {
        output_content = "No processes running.";
      } else if (Option.isNone(selected)) {
        if (state.processes.length > 0) {
          const _p = state.processes[0];
          if (_p) {
            output_content = `PID: none\n${_p.output}`;
          }
        }
      } else {
        const sId = selected.value;
        const process = state.processes.find((p) => p.id === sId);
        if (process) {
          output_content = `PID: ${sId}\n${process.output}`;
        } else {
          output_content = "Process not found.";
        }
      }

      // Build Errors Content
      const errors_content = state.processes
        .map((p) => `[${p.id}]: ${p.errors}`)
        .filter((e) => e.length > 0)
        .join("\n");

      // Create Borders
      const sidebar_border = "━".repeat(sidebar_width);
      const output_border = "━".repeat(output_width);
      const error_border = "━".repeat(error_width);

      const sidebar_lines = sidebar_content.split("\n");
      const output_lines = output_content.split("\n");
      const error_lines = errors_content.split("\n");

      // Determine the number of lines to fill the terminal height
      const terminal_height = process.stdout.rows - 3; // Subtract 2 for top and bottom borders
      const content_height = Math.max(sidebar_lines.length, output_lines.length, error_lines.length, terminal_height);

      let layout = "";

      // Add Borders to the layout
      layout += `┏${sidebar_border}┳${output_border}┳${error_border}┓\n`;

      for (let i = 0; i < content_height; i++) {
        const sidebarLine = sidebar_lines[i] || "".padEnd(sidebar_width);
        const outputLine = output_lines[i] || "".padEnd(output_width);
        const errorLine = error_lines[i] || "".padEnd(error_width);

        layout += `┃${sidebarLine.padEnd(sidebar_width)}┃${outputLine.padEnd(output_width)}┃${errorLine.padEnd(
          error_width
        )}┃\n`;
      }
      layout += `┗${sidebar_border}┻${output_border}┻${error_border}┛\n`;

      return layout;
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
