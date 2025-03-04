import { Worker } from "@effect/platform";
import { BunWorker } from "@effect/platform-bun";
import { Context, Layer } from "effect";
import * as OS from "node:os";

// Define Worker Pool Tag
export class ComputeWorkerPool extends Context.Tag("@p0/core/compute/workerPool")<
  ComputeWorkerPool,
  Worker.WorkerPool<object, unknown, unknown> // Generic type for tasks
>() {}

// Provide Worker Pool Layer
export const ComputeWorkerPoolLive = Worker.makePoolLayer(ComputeWorkerPool, {
  size: OS.availableParallelism(),
}).pipe(
  Layer.provide(BunWorker.layer(() => new globalThis.Worker(`${__dirname}/worker/compute.js`))) // Ensure this path is correct
);
