import { Effect, Layer, Match, Option } from "effect";
import { BaseLoggerLive, BaseLoggerService } from "../logger";
import { AppStateService } from "./app_state";
import { BunFileSystem } from "@effect/platform-bun";

export const FocusableComponents = {
  sidebar: "sidebar",
  output: "output",
  errors: "errors",
} as const;

export const InputStringToHex = {
  // q
  q: "71",
  // k
  k: "4b",
  // j
  j: "4a",
  // h
  h: "68",
  // l
  l: "6c",
  // ?
  question: "3f",
  // CTRL+C
  ctrl_c: "3",
} as const;

export class InputHandlerService extends Effect.Service<InputHandlerService>()("@p0/core/terminal/input_handler", {
  effect: Effect.gen(function* (_) {
    const appState = yield* _(AppStateService);
    const base_logger = yield* _(BaseLoggerService);
    const logger = base_logger.withGroup("input_handler");

    const handleInput = (key: string, raw: any | undefined = undefined) =>
      Effect.gen(function* (_) {
        yield* logger.info("handle_input", "key", key, "raw", JSON.stringify(raw));
        yield* _(
          appState.updateState((state) => {
            const newState = Match.value(key).pipe(
              // quit the program
              Match.when(InputStringToHex.q, () => ({ ...state, running: false })),
              Match.when(InputStringToHex.ctrl_c, () => ({ ...state, running: false })),
              // down
              Match.when(InputStringToHex.k, () => {
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
              Match.when(InputStringToHex.j, () => {
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
              Match.when(InputStringToHex.h, () => ({
                ...state,
                focusedComponent:
                  state.focusedComponent === FocusableComponents.output
                    ? FocusableComponents.sidebar
                    : state.focusedComponent === FocusableComponents.errors
                    ? FocusableComponents.output
                    : FocusableComponents.sidebar,
              })),
              Match.when(InputStringToHex.l, () => ({
                ...state,
                focusedComponent:
                  state.focusedComponent === FocusableComponents.sidebar
                    ? FocusableComponents.output
                    : state.focusedComponent === FocusableComponents.output
                    ? FocusableComponents.errors
                    : FocusableComponents.output,
              })),
              Match.when(InputStringToHex.question, () => ({ ...state, showHelp: !state.showHelp })),
              Match.orElse((input) => state)
            ); // Debugging

            return newState;
          })
        );
      });

    return {
      handleInput,
    };
  }),
  dependencies: [],
}) {}

export const InputHandlerLive = InputHandlerService.Default;
