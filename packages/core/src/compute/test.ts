import { BunContext, BunFileSystem, BunRuntime, BunWorker } from "@effect/platform-bun";
import { createId } from "@paralleldrive/cuid2";
import { Effect, Layer, Logger } from "effect";
import { ComputeUnit, ComputeUnitLive } from ".";
import { Cuid2Schema } from "../cuid2/schema";
import { BaseLoggerLive, json_logger } from "../logger";
import { ComputeTaskSchema } from "./schemas";
import { layerSpawner, PlatformWorker } from "@effect/platform/Worker";
import { Worker } from "@effect/platform";

const program = Effect.gen(function* (_) {
  const cu = yield* _(ComputeUnit);
  const task = ComputeTaskSchema.make({
    config: {},
    payload: {
      script: "console.log('hello world')",
    },
    id: Cuid2Schema.make(createId()),
  });
  Effect.log("task", task);

  const result = yield* cu.queue(task);
  Effect.log("result", result);
  const result2 = yield* cu.start();
  Effect.log("result2", result2);
});

const x = BunRuntime.runMain(
  Effect.scoped(
    program.pipe(
      Effect.provide(ComputeUnitLive),
      Effect.provide(BaseLoggerLive),
      Effect.provide(BunWorker.layerWorker),
      Effect.provide(BunContext.layer),
      Effect.provide(Logger.replaceScoped(Logger.defaultLogger, json_logger).pipe(Layer.provide(BunFileSystem.layer)))
    )
  )
);
