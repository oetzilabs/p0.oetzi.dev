import { BunContext, BunFileSystem } from "@effect/platform-bun";
import { Effect, Layer, Logger, Stream } from "effect";
import { ComputeUnit, ComputeUnitLive } from "@p0/core/src/compute";
import { ComputeManagerLive } from "@p0/core/src/compute/manager";
import { type ComputeTask } from "@p0/core/src/compute/schemas";
import { BaseLoggerLive, json_logger } from "@p0/core/src/logger";

export const worker_program = (taskStream: Stream.Stream<ComputeTask>) =>
  Effect.scoped(
    Effect.gen(function* (_) {
      const cu = yield* _(ComputeUnit);

      yield* taskStream.pipe(Stream.runForEach(cu.queue));
    })
      .pipe(
        Effect.provide(ComputeUnitLive),
        Effect.provide(ComputeManagerLive),
        Effect.provide(BaseLoggerLive),
        Effect.provide(BunContext.layer)
      )
      .pipe(
        Effect.provide(Logger.replaceScoped(Logger.defaultLogger, json_logger).pipe(Layer.provide(BunFileSystem.layer)))
      )
  );
