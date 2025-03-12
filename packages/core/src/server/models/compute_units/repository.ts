import { Effect, Option } from "effect";
import { ComputeManager, ComputeManagerLive } from "../../../compute/manager";
import { ComputeBinarySchema, ComputeTaskSchema, type ComputeBinary, type ComputeTask } from "../../../compute/schemas";
import { Cuid2Schema } from "../../../cuid2";
import { ComputeUnitBinaryAlreadyExists, ComputeUnitNotFound, ComputeUnitTaskAlreadyExists } from "./errors";

export class ComputeUnitRepository extends Effect.Service<ComputeUnitRepository>()("@p0/core/compute_unit/repo", {
  effect: Effect.gen(function* (_) {
    const cm = yield* _(ComputeManager);

    const run_task = (task: ComputeTask) => cm.process_task(task);

    const run_binary = (binary: ComputeBinary) => cm.process_binary(binary);

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
          const tid = task.value.id.split("_")[1];
          if (!tid) {
            return yield* Effect.fail(new ComputeUnitNotFound({ id }));
          }
          return ComputeTaskSchema.make({
            ...task.value,
            type: "task",
            id: Cuid2Schema.make(tid),
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
          const bid = binary.value.id.split("_")[1];
          if (!bid) {
            return yield* Effect.fail(new ComputeUnitNotFound({ id }));
          }
          return ComputeBinarySchema.make({
            ...binary.value,
            type: "binary",
            id: Cuid2Schema.make(bid),
            config: binary.value.config,
            download_url: binary.value.download_url,
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
