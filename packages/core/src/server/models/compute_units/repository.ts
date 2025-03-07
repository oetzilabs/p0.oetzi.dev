import { worker_program } from "@p0/worker";
import { Effect, Option, Stream } from "effect";
import * as Chunk from "effect/Chunk";
import { ComputeManager, ComputeManagerLive } from "../../../compute/manager";
import {
  ComputeBinarySchema,
  ComputeTaskSchema,
  type ComputeBinary,
  type ComputeTask,
  type ComputeUnit,
} from "../../../compute/schemas";
import {
  ComputeUnitNotFound,
  ComputeUnitBinaryAlreadyExists,
  ComputeUnitTaskAlreadyExists,
  ComputeUnitTaskNotCreated,
  ComputeUnitTaskNotFound,
  ComputeUnitTaskNotUnregistered,
} from "./errors";
import type { RemoveComputeUnitSchema } from "./schemas";
import { Cuid2Schema } from "../../../cuid2";

export class ComputeUnitRepository extends Effect.Service<ComputeUnitRepository>()("@p0/core/compute_unit/repo", {
  effect: Effect.gen(function* (_) {
    const cm = yield* _(ComputeManager);

    const run_task = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        return yield* cm.process_task(task);
      });

    const run_binary = (binary: ComputeBinary) =>
      Effect.gen(function* (_) {
        return yield* cm.process_binary(binary);
      });

    const register_task = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        // check if the task already exists
        const exists_in_queue = yield* cm.has_task(task.id);
        if (exists_in_queue) {
          return yield* Effect.fail(new ComputeUnitTaskAlreadyExists());
        }
        return yield* cm.queue_up_task(task);
      });

    const register_binary = (binary: ComputeBinary) =>
      Effect.gen(function* (_) {
        // check if the task already exists
        const exists_in_queue = yield* cm.has_binary(binary.id);
        if (exists_in_queue) {
          return yield* Effect.fail(new ComputeUnitBinaryAlreadyExists());
        }
        return yield* cm.queue_up_binary(binary);
      });

    const unregister_task = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        return yield* cm.queue_down_task(task);
      });

    const unregister_binary = (binary: ComputeBinary) =>
      Effect.gen(function* (_) {
        return yield* cm.queue_down_binary(binary);
      });

    const all_non_deleted = Effect.gen(function* (_) {
      return yield* Effect.succeed([] as any[]);
    });

    const all = Effect.gen(function* (_) {
      return yield* Effect.succeed([] as any[]);
    });

    const find_task_by_id = (id: typeof Cuid2Schema.Type) =>
      Effect.gen(function* (_) {
        const task = yield* cm.find_task(id);

        if (Option.isNone(task)) {
          return yield* Effect.fail(new ComputeUnitNotFound({ id }));
        } else {
          return ComputeTaskSchema.make({
            ...task.value,
            type: "task",
            id: Cuid2Schema.make(task.value.id.split("_")[1]),
            config: task.value.config,
          });
        }
      });

    const find_binary_by_id = (id: typeof Cuid2Schema.Type) =>
      Effect.gen(function* (_) {
        const binary = yield* cm.find_binary(id);

        if (Option.isNone(binary)) {
          return yield* Effect.fail(new ComputeUnitNotFound({ id }));
        } else {
          return ComputeBinarySchema.make({
            ...binary.value,

            type: "binary",
            id: Cuid2Schema.make(binary.value.id.split("_")[1]),
            config: binary.value.config,
          });
        }
      });

    return {
      register_task,
      register_binary,
      all_non_deleted,
      all,
      find_task_by_id,
      find_binary_by_id,
      unregister_binary,
      unregister_task,
      run_task,
      run_binary,
    } as const;
  }),
  dependencies: [ComputeManagerLive],
}) {}
