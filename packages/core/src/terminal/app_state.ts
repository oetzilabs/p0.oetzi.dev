import type { ProcessId, Signal } from "@effect/platform/CommandExecutor";
import type { PlatformError } from "@effect/platform/Error";
import type { Stream } from "effect";
import { Effect, Option, SubscriptionRef, SynchronizedRef } from "effect";
import { BaseLoggerService } from "../logger";
import type { Project } from "../projects";

const FocusableComponents = {
  sidebar: "sidebar",
  output: "output",
  errors: "errors",
} as const;

export interface Process {
  id: ProcessId;
  name: string;
  status: "running" | "stopped" | "daemon";
  kill: (signal?: Signal) => Effect.Effect<void, PlatformError>;
  stdout: Stream.Stream<string, PlatformError, never>;
  stderr: Stream.Stream<string, PlatformError, never>;
  output: string;
  errors: string;
  started_at: number;
  updated_at: Option.Option<number>;
  killed_at: Option.Option<number>;
}

export interface AppState {
  projects: Project[];
  processes: Process[];
  currentProject: Option.Option<Project>;
  selectedProcessId: Option.Option<ProcessId>;
  searchQuery: string;
  showHelp: boolean;
  focusedComponent: (typeof FocusableComponents)[keyof typeof FocusableComponents];
  running: boolean;
}

export const initialState: AppState = {
  projects: [],
  processes: [],
  currentProject: Option.none(),
  selectedProcessId: Option.none(),
  searchQuery: "",
  showHelp: false,
  focusedComponent: FocusableComponents.sidebar,
  running: true,
};

export class AppStateService extends Effect.Service<AppStateService>()("@p0/core/terminal/app_state", {
  effect: Effect.gen(function* (_) {
    const base_logger = yield* _(BaseLoggerService);
    const logger = base_logger.withGroup("app_state");
    const state = yield* SynchronizedRef.make(initialState);

    const getState = SynchronizedRef.get(state);
    const setState = state.modify;
    const updateState = (fn: (s: AppState) => AppState) =>
      SubscriptionRef.updateEffect(state, (s) =>
        Effect.gen(function* (_) {
          const new_state = fn(s);
          yield* logger.info("update_state", "new_state", JSON.stringify(new_state));
          return new_state;
        })
      );

    return {
      // state,
      getState,
      setState,
      updateState,
    };
  }),
  dependencies: [],
}) {}

export const AppStateLive = AppStateService.Default;
