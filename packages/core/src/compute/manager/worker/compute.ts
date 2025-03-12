import { BunRuntime, BunWorkerRunner } from "@effect/platform-bun";
import * as Runner from "@effect/platform/WorkerRunner";
import { Effect, Layer, Stream } from "effect";
import type { ComputeTask } from "../../schemas";

const WorkerLive = Effect.gen(function* () {
  yield* Runner.make((config: ComputeTask["config"]) =>
    Stream.fromEffect(
      Effect.gen(function* (_) {
        const userCode = config.script ?? "async function main(pl, mods) { throw new Error('No script provided') }"; // Assuming payload has a 'code' property
        const entryPoint = "main";

        // Define the allowed modules
        const allowedModules = {
          Math: Math,
          Date: Date,
          JSON: JSON,
          // Add any other modules you want to allow
          customFunction: (x: number) => x * 2, // Example custom function
        };

        // Construct the function dynamically, passing allowedModules as an argument
        const sandbox = new Function(
          "payload",
          "allowedModules",
          `
${userCode};
if (typeof ${entryPoint} !== 'function') {
  throw new Error('${entryPoint} is not a function or is not defined.');
}
return ${entryPoint}(payload, allowedModules);
`
        );

        const async_fn = async () => {
          try {
            return await sandbox(config.payload ?? {}, allowedModules); // Pass allowedModules when calling sandbox
          } catch (error) {
            console.error("Error executing user code:", error);
            return { error: String(error) }; // Or handle the error as needed
          }
        };
        const result = yield* Effect.promise(() => async_fn());
        return result;
      })
    )
  );

  yield* Effect.addFinalizer(() => {
    return Effect.log("worker closed");
  });
}).pipe(Layer.scopedDiscard, Layer.provide(BunWorkerRunner.layer));

BunRuntime.runMain(Runner.launch(WorkerLive));
