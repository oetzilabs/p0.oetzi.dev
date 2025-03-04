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

    const queue = (task: ComputeTask) => cm.queue_up(task);
    const start = () => cm.loop;

    return { queue, start } as const;
  }),
  dependencies: [ComputeManagerLive],
}) {}

export const ComputeUnitLive = ComputeUnit.Default;
