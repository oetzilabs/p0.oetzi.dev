import { Effect, Stream } from "effect";
import { type ComputeTask } from "../schemas";
import { BaseLoggerService } from "../../logger";
import { Worker } from "@effect/platform";
import { ComputeWorkerPool, ComputeWorkerPoolLive } from "./pool"; // Import worker pool

export class ComputeRunner extends Effect.Service<ComputeRunner>()("@p0/core/compute/runner", {
  effect: Effect.gen(function* (_) {
    const workerPool = yield* _(ComputeWorkerPool);

    const execute = (task: ComputeTask) =>
      Effect.gen(function* () {
        const execution = workerPool.execute(task.config);
        // yield* execution.pipe(
        //   Stream.runForEach((output) => Effect.log("compute_runner#execute:stream", "output", output))
        // );
        return execution;
      });

    return { execute } as const;
  }),
  dependencies: [ComputeWorkerPoolLive],
}) {}

export const ComputeRunnerLive = ComputeRunner.Default;
