import { BunRuntime, BunWorkerRunner } from "@effect/platform-bun";
import * as Runner from "@effect/platform/WorkerRunner";
import { Effect, Layer, Stream } from "effect";
import type { ComputeTask } from "../../schemas";

const WorkerLive = Effect.gen(function* () {
  yield* Runner.make((payload: ComputeTask["payload"]) =>
    Stream.fromEffect(Effect.succeed(execute_script(`(payload) => {${payload.script ?? ""}}`, payload.payload ?? {})))
  );

  yield* Effect.addFinalizer((e) => {
    return Effect.log("worker closed");
  });
}).pipe(Layer.scopedDiscard, Layer.provide(BunWorkerRunner.layer));

BunRuntime.runMain(Runner.launch(WorkerLive));

const execute_script = (script: string, payload: any) => {
  const sandbox = eval(script);
  return sandbox(payload);
};
