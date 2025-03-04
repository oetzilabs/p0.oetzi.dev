import { Effect, Queue } from "effect";
import { type ComputeTask } from "../schemas";
import { BaseLoggerService } from "../../logger";
import { ComputeRunner, ComputeRunnerLive } from "./runner";
import * as OS from "node:os";

export class ComputeManager extends Effect.Service<ComputeManager>()("@p0/core/compute/manager", {
  effect: Effect.gen(function* (_) {
    const log = yield* _(BaseLoggerService);
    const logger = log.withGroup("compute_manager");

    // Get CPU count for queue size
    const queue = yield* Queue.bounded<ComputeTask>(Math.max(2, OS.cpus().length));
    const runner = yield* _(ComputeRunner);

    const queue_up = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        yield* logger.info("compute_manager#queue_up", "task", task);
        yield* queue.offer(task);
        yield* logger.info("queue", "#capacity", queue.capacity());
        return task.id;
      });

    const loop = Effect.whileLoop({
      while: () => true,
      body: () =>
        Effect.gen(function* (_) {
          const task = yield* queue.take;
          logger.info("task_yield", JSON.stringify(task));
          const result = yield* runner.execute(task);
          return result;
        }),
      step: (a) => {
        return Effect.succeed(a);
      },
    });

    return { queue_up, loop } as const;
  }),
  dependencies: [ComputeRunnerLive],
}) {}

export const ComputeManagerLive = ComputeManager.Default;
