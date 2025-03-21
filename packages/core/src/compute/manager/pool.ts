import { Worker } from "@effect/platform";
import { BunWorker } from "@effect/platform-bun";
import { Context, Layer } from "effect";
import * as OS from "node:os";
import type { ComputeTask } from "../schemas";

export class ComputeWorkerPool extends Context.Tag("@p0/core/compute/worker_pool")<
  ComputeWorkerPool,
  Worker.WorkerPool<ComputeTask["config"], any, any> // Generic type for tasks
>() {}

export const ComputeWorkerPoolLive = Worker.makePoolLayer(ComputeWorkerPool, {
  size: OS.availableParallelism(),
}).pipe(Layer.provide(BunWorker.layer((id) => new globalThis.Worker(`${__dirname}/worker/compute.ts`))));
