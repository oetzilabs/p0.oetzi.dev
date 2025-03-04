import { BunContext, BunFileSystem, BunRuntime, BunWorker } from "@effect/platform-bun";
import { createId } from "@paralleldrive/cuid2";
import { Duration, Effect, Layer, Logger } from "effect";
import { ComputeUnit, ComputeUnitLive } from ".";
import { Cuid2Schema } from "../cuid2/schema";
import { BaseLoggerLive, BaseLoggerService, json_logger } from "../logger";
import { ComputeTaskSchema } from "./schemas";
import { layerSpawner, PlatformWorker } from "@effect/platform/Worker";
import { Worker } from "@effect/platform";

const program = Effect.gen(function* (_) {
  const log = yield* _(BaseLoggerService);
  const logger = log.withGroup("program");
  const cu = yield* _(ComputeUnit);
  yield* logger.info("program", "setting up");
  yield* logger.info("program", "preparing task");
  const task = ComputeTaskSchema.make({
    config: {},
    payload: {
      payload: {
        test: "hello world",
      },
      script: "console.log(payload.test)",
    },
    id: Cuid2Schema.make(createId()),
  });
  yield* logger.info("program", "task", task);

  const task2 = ComputeTaskSchema.make({
    config: {},
    payload: {
      payload: {},
      script: "console.log(process.cwd(), payload)",
    },
    id: Cuid2Schema.make(createId()),
  });

  yield* cu.queue(task);
  yield* cu.queue(task2);
  // yield* Effect.sleep(Duration.seconds(1));
  yield* cu.start;
});

const x = BunRuntime.runMain(
  Effect.scoped(
    program.pipe(
      Effect.provide(ComputeUnitLive),
      Effect.provide(BaseLoggerLive),
      Effect.provide(BunContext.layer),
      Effect.provide(Logger.replaceScoped(Logger.defaultLogger, json_logger).pipe(Layer.provide(BunFileSystem.layer)))
    )
  )
);
