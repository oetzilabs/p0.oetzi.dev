import { Effect, Queue, SubscriptionRef } from "effect";
import { type ComputeTask } from "../schemas";
import { BaseLoggerService } from "../../logger";
import { ComputeRunner, ComputeRunnerLive } from "./runner";
import * as OS from "node:os";

export class ComputeManager extends Effect.Service<ComputeManager>()("@p0/core/compute/manager", {
  effect: Effect.gen(function* (_) {
    const log = yield* _(BaseLoggerService);
    const logger = log.withGroup("compute_manager");

    // Get CPU count for queue size
    const queue = yield* Queue.unbounded<ComputeTask>();
    const runner = yield* _(ComputeRunner);

    const queue_up = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        yield* logger.info("compute_manager#queue_up", "task", JSON.stringify(task));
        yield* queue.offer(task);
        yield* logger.info("queue", "#capacity", queue.capacity());
        return task.id;
      });

    const process_task = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        yield* logger.info("Processing task", task.id);
        yield* logger.info("Task completed", task.id);
        yield* runner.execute(task);
      });

    const start_loop = Effect.gen(function* (_) {
      const loop = Effect.gen(function* (_) {
        let duration = 0;
        while (queue.isActive()) {
          const start = Date.now();
          const task = yield* queue.take; // Take a task from the queue (blocks if empty)
          yield* process_task(task);
          duration += Date.now() - start;
        }
      }).pipe(Effect.forever); // Keep the loop going indefinitely

      // Fork the loop to run it in the background
      yield* Effect.fork(loop);
    });

    // const x = yield* loop;

    return { queue_up, start_loop } as const;
  }),
  dependencies: [ComputeRunnerLive],
}) {}

export const ComputeManagerLive = ComputeManager.Default;
