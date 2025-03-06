import { Effect, Stream } from "effect";
import { type ComputeTask } from "../schemas";
import { BaseLoggerService } from "../../logger";
import { Worker } from "@effect/platform";
import { ComputeWorkerPool, ComputeWorkerPoolLive } from "./pool"; // Import worker pool

export class ComputeRunner extends Effect.Service<ComputeRunner>()("@p0/core/compute/runner", {
  effect: Effect.gen(function* (_) {
    const log = yield* _(BaseLoggerService);
    const logger = log.withGroup("compute_runner");

    const workerPool = yield* _(ComputeWorkerPool);

    const execute = <CT extends ComputeTask>(task: CT) =>
      Effect.gen(function* () {
        const execution = workerPool.execute(task.config);
        yield* execution.pipe(
          Stream.runForEach((output) => logger.info("compute_runner#execute:stream", "output", output))
        );
        return execution;
      });

    return { execute } as const;
  }),
  dependencies: [ComputeWorkerPoolLive(15)],
}) {}

export const ComputeRunnerLive = ComputeRunner.Default;
