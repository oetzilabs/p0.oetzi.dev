import { Channel, Chunk, Effect, Option, PubSub, Stream, SubscriptionRef } from "effect";
import { type ComputeBinary, type ComputeTask, type ComputeUnit } from "../schemas";
import { ComputeRunner, ComputeRunnerLive } from "./runner";
import { Cuid2Schema } from "../../cuid2";
import { Database, DatabaseLive } from "../../db";
import { compute_binary_units, compute_task_units } from "../../db/schemas/compute_units";
import {
  ComputeUnitBinaryNotCreated,
  ComputeUnitBinaryNotDeleted,
  ComputeUnitTaskNotCreated,
  ComputeUnitTaskNotDeleted,
} from "../../server/models/compute_units/errors";
import { eq } from "drizzle-orm";

// The Compute Manager service
export class ComputeManager extends Effect.Service<ComputeManager>()("@p0/core/compute/manager", {
  effect: Effect.gen(function* (_) {
    const db = yield* _(Database);
    // Unbounded PubSub for broadcasting tasks
    const pubSub = yield* PubSub.unbounded<ComputeTask>();
    const dequeue = yield* PubSub.subscribe(pubSub);

    // Runner that executes tasks
    const runner = yield* _(ComputeRunner);

    // Add a task to the PubSub
    const queue_up = (unit: ComputeUnit) =>
      Effect.gen(function* (_) {
        switch (unit.type) {
          case "task":
            const tasks = yield* Effect.promise(() =>
              db
                .insert(compute_task_units)
                .values({
                  config: unit.config,
                })
                .returning()
            );
            if (tasks.length === 0) {
              return yield* Effect.fail(new ComputeUnitTaskNotCreated({ id: unit.id }));
            }
            return Cuid2Schema.make(tasks[0].id.split("_")[1]);
          case "binary":
            const binaries = yield* Effect.promise(() =>
              db
                .insert(compute_binary_units)
                .values({
                  config: unit.config,
                  download_url: unit.download_url,
                })
                .returning()
            );
            if (binaries.length === 0) {
              return yield* Effect.fail(new ComputeUnitBinaryNotCreated());
            }
            return Cuid2Schema.make(binaries[0].id.split("_")[1]);
        }
      });

    // Add a task to the PubSub
    const queue_up_task = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        const tasks = yield* Effect.promise(() =>
          db
            .insert(compute_task_units)
            .values({
              config: task.config,
            })
            .returning()
        );
        if (tasks.length === 0) {
          return yield* Effect.fail(new ComputeUnitTaskNotCreated({ id: task.id }));
        }
        return Cuid2Schema.make(tasks[0].id.split("_")[1]);
      });

    // Add a binary to the PubSub
    const queue_up_binary = (binary: ComputeBinary) =>
      Effect.gen(function* (_) {
        const binaries = yield* Effect.promise(() =>
          db
            .insert(compute_binary_units)
            .values({
              config: binary.config,
              download_url: binary.download_url,
            })
            .returning()
        );
        if (binaries.length === 0) {
          return yield* Effect.fail(new ComputeUnitBinaryNotCreated({ id: binary.id }));
        }
        return Cuid2Schema.make(binaries[0].id.split("_")[1]);
      });
    // Remove a task from active tasks (task completed or canceled)
    const queue_down_task = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        const removed_task = yield* Effect.promise(() =>
          db
            .delete(compute_task_units)
            .where(eq(compute_task_units.id, `ctu_${task.id}`))
            .returning()
        );
        if (removed_task.length === 0) {
          return yield* Effect.fail(new ComputeUnitTaskNotDeleted());
        }
        return Cuid2Schema.make(removed_task[0].id.split("_")[1]);
      });

    const queue_down_binary = (binary: ComputeBinary) =>
      Effect.gen(function* (_) {
        const removed_binary = yield* Effect.promise(() =>
          db
            .delete(compute_binary_units)
            .where(eq(compute_binary_units.id, `cbu_${binary.id}`))
            .returning()
        );
        if (removed_binary.length === 0) {
          return yield* Effect.fail(new ComputeUnitBinaryNotDeleted());
        }
        return Cuid2Schema.make(removed_binary[0].id.split("_")[1]);
      });

    // Check if a task is currently active
    const has_task = (task_id: typeof Cuid2Schema.Type) =>
      Effect.gen(function* (_) {
        const tasks = yield* Effect.promise(() =>
          db
            .select()
            .from(compute_task_units)
            .where(eq(compute_task_units.id, `ctu_${task_id}`))
            .limit(1)
        );
        return yield* Effect.succeed(tasks.length > 0);
      });

    // Check if a task is currently active
    const has_binary = (binary_id: typeof Cuid2Schema.Type) =>
      Effect.gen(function* (_) {
        const binaries = yield* Effect.promise(() =>
          db
            .select()
            .from(compute_binary_units)
            .where(eq(compute_binary_units.id, `cbu_${binary_id}`))
            .limit(1)
        );
        return yield* Effect.succeed(binaries.length > 0);
      });

    // Find a task by ID
    const find_task = (task_id: typeof Cuid2Schema.Type) =>
      Effect.gen(function* (_) {
        const tasks = yield* Effect.promise(() =>
          db
            .select()
            .from(compute_task_units)
            .where(eq(compute_task_units.id, `ctu_${task_id}`))
            .limit(1)
        );
        if (tasks.length === 0) {
          return Option.none();
        }
        return Option.some(tasks[0]);
      });

    // Find a task by ID
    const find_binary = (binary_id: typeof Cuid2Schema.Type) =>
      Effect.gen(function* (_) {
        const binaries = yield* Effect.promise(() =>
          db
            .select()
            .from(compute_binary_units)
            .where(eq(compute_binary_units.id, `cbu_${binary_id}`))
            .limit(1)
        );
        if (binaries.length === 0) {
          return Option.none();
        }
        return Option.some(binaries[0]);
      });

    // Process tasks received from the PubSub
    const process_task = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        const result_stream = yield* runner.execute_task(task);
        const result_chunk = yield* _(Stream.runCollect(result_stream));
        const result_array = Chunk.toArray(result_chunk);
        return yield* Effect.succeed(result_array[0]);
      });

    const process_binary = (binary: ComputeBinary) =>
      Effect.gen(function* (_) {
        const result_stream = yield* runner.execute_binary(binary);
        const result_chunk = yield* _(Stream.runCollect(result_stream));
        const result_array = Chunk.toArray(result_chunk);
        return yield* Effect.succeed(result_array[0]);
      });

    const dequeue_task = Effect.gen(function* (_) {
      yield* dequeue.pipe(Stream.runForEach(process_task));
    }).pipe(Effect.forever);

    yield* Effect.forkDaemon(dequeue_task);

    return {
      queue_up_binary,
      queue_up_task,
      queue_down_task,
      queue_down_binary,
      has_task,
      has_binary,
      find_task,
      find_binary,
      process_task,
      process_binary,
    } as const;
  }),
  dependencies: [DatabaseLive, ComputeRunnerLive],
}) {}

export const ComputeManagerLive = ComputeManager.Default;
