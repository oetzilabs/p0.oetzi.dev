import type { ProcessId, Signal } from "@effect/platform/CommandExecutor";
import type { PlatformError } from "@effect/platform/Error";
import { Effect, Option, Stream, SubscriptionRef } from "effect";
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

type DifferenceType = {
  path: string[];
  value: { new: unknown } | unknown;
};

const findStringDifference = (a: string, b: string): string => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) {
    i++;
  }

  let j = 0;
  while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) {
    j++;
  }

  return b.substring(i, b.length - j);
};

const seek_deep_change = (a_value: unknown, b_value: unknown, keys: string[]): DifferenceType | undefined => {
  if (typeof a_value === "object" && a_value !== null && typeof b_value === "object" && b_value !== null) {
    if (Array.isArray(a_value) && Array.isArray(b_value)) {
      if (a_value.length !== b_value.length) {
        return {
          path: keys,
          value: { new: b_value },
        };
      }
      for (let i = 0; i < a_value.length; i++) {
        const deepChange = seek_deep_change(a_value[i], b_value[i], [...keys, i.toString()]);
        if (deepChange) {
          return deepChange;
        }
      }
    } else {
      const aKeys = Object.keys(a_value as object);
      const bKeys = Object.keys(b_value as object);

      const allKeys = new Set([...aKeys, ...bKeys]);

      for (const key of allKeys) {
        const aHasKey = Object.prototype.hasOwnProperty.call(a_value, key);
        const bHasKey = Object.prototype.hasOwnProperty.call(b_value, key);

        if (aHasKey && bHasKey) {
          const deepChange = seek_deep_change((a_value as any)[key], (b_value as any)[key], [...keys, key]);
          if (deepChange) {
            return deepChange;
          }
        } else {
          return {
            path: [...keys, key],
            value: {
              new: bHasKey ? (b_value as any)[key] : undefined,
            },
          };
        }
      }
    }
  } else if (typeof a_value === "string" && typeof b_value === "string") {
    const addedText = findStringDifference(a_value, b_value);
    if (addedText) {
      return {
        path: keys,
        value: { new: addedText },
      };
    }
  } else if (a_value !== b_value) {
    return {
      path: keys,
      value: { new: b_value },
    };
  }

  return undefined;
};

type StateDifferenceType = {
  added: DifferenceType[];
  removed: DifferenceType[];
  changed: DifferenceType[];
  total_differences: number;
};

export const difference_state = <T extends Record<string, any>>(a: T, b: T): StateDifferenceType => {
  const added: DifferenceType[] = [];
  const removed: DifferenceType[] = [];
  const changed: DifferenceType[] = [];

  const aKeys = new Set(Object.keys(a));
  const bKeys = new Set(Object.keys(b));

  for (const key of aKeys) {
    if (!bKeys.has(key)) {
      removed.push({
        path: [key],
        value: { new: undefined },
      });
    } else {
      const a_value = a[key];
      const b_value = b[key];

      const diff = seek_deep_change(a_value, b_value, [key]);
      if (diff) {
        changed.push(diff);
      }
    }
  }

  for (const key of bKeys) {
    if (!aKeys.has(key)) {
      added.push({
        path: [key],
        value: { new: b[key] },
      });
    }
  }

  return {
    added,
    removed,
    changed,
    total_differences: added.length + removed.length + changed.length,
  };
};

export class AppStateService extends Effect.Service<AppStateService>()("@p0/core/terminal/app_state", {
  effect: Effect.gen(function* (_) {
    const base_logger = yield* _(BaseLoggerService);
    const logger = base_logger.withGroup("app_state");
    const state = yield* SubscriptionRef.make(initialState);

    const getState = SubscriptionRef.get(state);
    const setState = state.modify;
    const updateState = (fn: (s: AppState) => AppState) =>
      SubscriptionRef.updateEffect(state, (s) =>
        Effect.gen(function* (_) {
          const new_state = fn(s);
          const differences = difference_state(s, new_state);
          if (differences.total_differences > 0) {
            yield* logger.info("update_state", JSON.stringify(differences));
          }
          return new_state;
        })
      );

    // const log_changes = state.changes.pipe(Stream.changes).pipe(Stream.map((s) => JSON.stringify(s)));

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
