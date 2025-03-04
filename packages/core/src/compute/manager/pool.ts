import { Worker } from "@effect/platform";
import { BunWorker } from "@effect/platform-bun";
import { Context, Duration, Effect, Layer } from "effect";
import * as OS from "node:os";

// Define Worker Pool Tag
export class ComputeWorkerPool extends Context.Tag("@p0/core/compute/worker_pool")<
  ComputeWorkerPool,
  Worker.WorkerPool<object, unknown, unknown> // Generic type for tasks
>() {}

// Provide Worker Pool Layer
export const ComputeWorkerPoolLive = (ttl_minutes: number) =>
  Worker.makePoolLayer(ComputeWorkerPool, {
    size: OS.availableParallelism(),
    concurrency: OS.availableParallelism(),
    targetUtilization: 2,
    timeToLive: Duration.minutes(ttl_minutes),
  }).pipe(Layer.provide(BunWorker.layer((id) => new globalThis.Worker(`${__dirname}/worker/compute.ts`))));
