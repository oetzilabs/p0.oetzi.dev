import { Duration, Effect, SubscriptionRef } from "effect";
import { ComputeManager } from "./manager";
import { ComputeStatus, type ComputeStatusEnum, type ComputeTask } from "./schemas";

export class ComputeUnit extends Effect.Service<ComputeUnit>()("@p0/core/compute/unit", {
  effect: Effect.gen(function* (_) {
    const cm = yield* _(ComputeManager);

    const status = yield* SubscriptionRef.make<ComputeStatusEnum>(ComputeStatus.Uninitialized());

    const queue = (task: ComputeTask) =>
      Effect.gen(function* () {
        yield* SubscriptionRef.update(status, (s) => ComputeStatus.Initializing());
        const _task = yield* cm.queue_up_task(task);
        yield* SubscriptionRef.update(status, (s) => ComputeStatus.Initialized());
        return _task;
      });

    return { queue } as const;
  }),
  dependencies: [],
}) {}

export const ComputeUnitLive = ComputeUnit.Default;

export const create = (payload: ComputeTask): ComputeTask => ({
  type: "task",
  id: payload.id,
  config: payload.config ?? {},
  result: undefined,
  errors: [],
  duration: Duration.zero,
  resources: payload.resources ?? [],
  dependencies: payload.dependencies ?? [],
  timeout: payload.timeout ?? Duration.seconds(30),
});
