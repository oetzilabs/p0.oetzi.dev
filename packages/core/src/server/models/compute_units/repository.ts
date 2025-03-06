import { worker_program } from "@p0/worker";
import { Effect, Option, Stream } from "effect";
import * as Chunk from "effect/Chunk";
import { ComputeManager, ComputeManagerLive } from "../../../compute/manager";
import { type ComputeTask } from "../../../compute/schemas";
import {
  ComputeUnitTaskAlreadyExists,
  ComputeUnitTaskNotCreated,
  ComputeUnitTaskNotFound,
  ComputeUnitTaskNotUnregistered,
} from "./errors";
import type { RemoveComputeUnitSchema } from "./schemas";

export class ComputeUnitRepository extends Effect.Service<ComputeUnitRepository>()("@p0/core/compute_unit/repo", {
  effect: Effect.gen(function* (_) {
    const cm = yield* _(ComputeManager);

    const run = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        return yield* cm.execute(task);
      });

    const register = (body: ComputeTask) =>
      Effect.gen(function* (_) {
        // check if the task already exists
        const exists_in_queue = yield* cm.has_task(body.id);
        if (exists_in_queue) {
          return yield* Effect.fail(new ComputeUnitTaskAlreadyExists());
        }
        return yield* cm.queue_up(body);
      });

    const unregister = (id: typeof RemoveComputeUnitSchema.Type) =>
      Effect.gen(function* (_) {
        return yield* cm.queue_down(id);
      });

    const all_non_deleted = Effect.gen(function* (_) {
      return yield* Effect.succeed([] as any[]);
    });

    const all = Effect.gen(function* (_) {
      return yield* Effect.succeed([] as any[]);
    });

    const find_by_id = (id: string) =>
      Effect.gen(function* (_) {
        const task = yield* cm.find_task(id);

        if (Option.isNone(task)) {
          return yield* Effect.fail(new ComputeUnitTaskNotFound());
        } else {
          return yield* Effect.succeed(task.value);
        }
      });

    return {
      register,
      all_non_deleted,
      all,
      find_by_id,
      unregister,
      run,
    } as const;
  }),
  dependencies: [ComputeManagerLive],
}) {}
