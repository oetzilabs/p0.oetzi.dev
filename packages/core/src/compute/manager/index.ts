import { Channel, Chunk, Effect, Option, PubSub, Stream, SubscriptionRef } from "effect";
import { type ComputeTask } from "../schemas";
import { ComputeRunner, ComputeRunnerLive } from "./runner";
import { Cuid2Schema } from "../../cuid2";

// The Compute Manager service
export class ComputeManager extends Effect.Service<ComputeManager>()("@p0/core/compute/manager", {
  effect: Effect.gen(function* (_) {
    // Unbounded PubSub for broadcasting tasks
    const pubSub = yield* PubSub.unbounded<ComputeTask>();
    const dequeue = yield* PubSub.subscribe(pubSub);

    // Runner that executes tasks
    const runner = yield* _(ComputeRunner);

    // Track active tasks
    const activeTasks = yield* SubscriptionRef.make(new Map<string, ComputeTask>());

    // Add a task to the PubSub
    const queue_up = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        // Publish task to all subscribers
        yield* pubSub.publish(task);
        // Track the task as active
        yield* SubscriptionRef.update(activeTasks, (map) => new Map(map).set(task.id, task));
        return yield* Effect.succeed(task.id);
      });

    // Remove a task from active tasks (task completed or canceled)
    const queue_down = (task_id: Cuid2Schema) =>
      Effect.gen(function* (_) {
        yield* SubscriptionRef.update(activeTasks, (map) => {
          const newMap = new Map(map);
          newMap.delete(task_id); // Remove task from active state
          return newMap;
        });
        return yield* Effect.succeed(task_id);
      });

    // Check if a task is currently active
    const has_task = (task_id: string) =>
      Effect.gen(function* (_) {
        const tasks = yield* SubscriptionRef.get(activeTasks);
        return yield* Effect.succeed(tasks.has(task_id));
      });

    // Find a task by ID
    const find_task = (task_id: string) =>
      Effect.gen(function* (_) {
        const tasks = yield* SubscriptionRef.get(activeTasks);
        const task = tasks.get(task_id);
        return task ? Option.some(task) : Option.none();
      });

    // Process tasks received from the PubSub
    const process_task = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        const result_stream = yield* runner.execute(task);
        const result_chunk = yield* _(Stream.runCollect(result_stream));
        const result_array = Chunk.toArray(result_chunk);
        return yield* Effect.succeed(result_array[0]);
      });

    const dequeue_task = Effect.gen(function* (_) {
      yield* dequeue.pipe(Stream.runForEach(process_task));
    }).pipe(Effect.forever);

    yield* Effect.forkDaemon(dequeue_task);

    return {
      queue_up,
      queue_down,
      has_task,
      find_task,
      execute: process_task,
    } as const;
  }),
  dependencies: [ComputeRunnerLive],
}) {}

export const ComputeManagerLive = ComputeManager.Default;
