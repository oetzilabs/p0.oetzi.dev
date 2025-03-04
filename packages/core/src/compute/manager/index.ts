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
    const cpus = Math.max(2, OS.cpus().length);
    const queue = yield* Queue.bounded<ComputeTask>(Math.max(2, cpus));
    const runner = yield* _(ComputeRunner);

    const queue_up = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        yield* queue.offer(task);
        return task.id;
      });

    const loop = Effect.whileLoop({
      body: () =>
        Effect.gen(function* (_) {
          const task = yield* queue.take;
          logger.info("task_yield", JSON.stringify(task));
          const result = yield* runner.execute(task);
          return result;
        }),
      while: () => true,
      step(a) {
        return Effect.succeed(a);
      },
    }).pipe(Effect.forkDaemon);

    return { queue_up, loop } as const;
  }),
  dependencies: [ComputeRunnerLive],
}) {}

export const ComputeManagerLive = ComputeManager.Default;
