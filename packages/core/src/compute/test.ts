import { BunContext, BunFileSystem, BunRuntime, BunWorker } from "@effect/platform-bun";
import { createId } from "@paralleldrive/cuid2";
import { Duration, Effect, Layer, Logger } from "effect";
import { ComputeUnit, ComputeUnitLive } from ".";
import { Cuid2Schema } from "../cuid2/schema";
import { BaseLoggerLive, BaseLoggerService, json_logger } from "../logger";
import { ComputeTaskSchema } from "./schemas";
import { layerSpawner, PlatformWorker } from "@effect/platform/Worker";
import { Worker } from "@effect/platform";
import { ComputeManager, ComputeManagerLive } from "./manager";

const program = Effect.gen(function* (_) {
  const log = yield* _(BaseLoggerService);
  const logger = log.withGroup("program");
  const cm = yield* _(ComputeManager);
  const cu = yield* _(ComputeUnit);

  const test_task = (x: number) =>
    ComputeTaskSchema.make({
      config: {},
      payload: {
        payload: {},
        script: `
        async function main(pl, mods) { 
        await new Promise(resolve => setTimeout(resolve, 10 * ${x}));
        console.log(pl,"${x}"); 
        return "${x}";
        }`,
      },
      id: Cuid2Schema.make(createId()),
    });

  for (let i = 0; i < 20; i++) {
    const task = test_task(i);
    yield* cu.queue(task);
  }

  yield* cm.start_loop;
  yield* Effect.forever(Effect.void);
});

const x = BunRuntime.runMain(
  Effect.scoped(
    program.pipe(
      Effect.provide(ComputeUnitLive),
      Effect.provide(ComputeManagerLive),
      Effect.provide(BaseLoggerLive),
      Effect.provide(BunContext.layer),
      Effect.provide(Logger.replaceScoped(Logger.defaultLogger, json_logger).pipe(Layer.provide(BunFileSystem.layer)))
    )
  )
);
