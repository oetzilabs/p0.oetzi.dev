import { Effect, SubscriptionRef } from "effect";
import { ComputeStatus, type ComputeStatusEnum, type ComputeTask } from "./schemas";
import { BaseLoggerService } from "../logger";
import { ComputeManager, ComputeManagerLive } from "./manager";

export class ComputeUnit extends Effect.Service<ComputeUnit>()("@p0/core/compute/unit", {
  effect: Effect.gen(function* (_) {
    const cm = yield* _(ComputeManager);
    const log = yield* _(BaseLoggerService);
    const logger = log.withGroup("compute_unit");

    const status = yield* SubscriptionRef.make<ComputeStatusEnum>(ComputeStatus.Uninitialized());

    const queue = (task: ComputeTask) =>
      Effect.gen(function* () {
        yield* SubscriptionRef.update(status, (s) => ComputeStatus.Initializing());
        const _task = yield* cm.queue_up(task);
        yield* logger.info("compute_unit#queue", "task queued up:", _task);
        yield* SubscriptionRef.update(status, (s) => ComputeStatus.Initialized());
        return _task;
      });

    return { queue } as const;
  }),
  dependencies: [],
}) {}

export const ComputeUnitLive = ComputeUnit.Default;
