import { BunContext } from "@effect/platform-bun";
import { ComputeUnit, ComputeUnitLive } from "@p0/core/src/compute";
import { ComputeManagerLive } from "@p0/core/src/compute/manager";
import { type ComputeTask } from "@p0/core/src/compute/schemas";
import { BaseLoggerLive } from "@p0/core/src/logger";
import { Effect, Stream } from "effect";

export const worker_program = (taskStream: Stream.Stream<ComputeTask>) =>
  Effect.gen(function* (_) {
    const cu = yield* _(ComputeUnit);

    yield* taskStream.pipe(Stream.runForEach(cu.queue));
  }).pipe(
    Effect.provide(ComputeUnitLive),
    Effect.provide(ComputeManagerLive),
    Effect.provide(BaseLoggerLive),
    Effect.provide(BunContext.layer)
  );
