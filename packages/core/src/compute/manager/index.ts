import { eq } from "drizzle-orm";
import { Chunk, Effect, Option, PubSub, Stream } from "effect";
import { Cuid2Schema } from "../../cuid2";
import { Database, DatabaseLive } from "../../db";
import { compute_binary_units, compute_task_units } from "../../db/schemas/compute_units";
import {
  ComputeUnitBinaryNotCreated,
  ComputeUnitBinaryNotDeleted,
  ComputeUnitBinaryNotUpdated,
  ComputeUnitTaskNotCreated,
  ComputeUnitTaskNotDeleted,
} from "../../server/models/compute_units/errors";
import { ComputeBinarySchema, type ComputeBinary, type ComputeTask } from "../schemas";
import { ComputeRunner, ComputeRunnerLive } from "./runner";

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
    // const queue_up = (unit: ComputeUnit) =>
    //   Effect.gen(function* (_) {
    //     switch (unit.type) {
    //       case "task":
    //         const tasks = yield* Effect.promise(() =>
    //           db
    //             .insert(compute_task_units)
    //             .values({
    //               config: unit.config,
    //             })
    //             .returning()
    //         );
    //         if (tasks.length === 0) {
    //           return yield* Effect.fail(new ComputeUnitTaskNotCreated({ id: unit.id }));
    //         }
    //         if (!tasks[0]) {
    //           return yield* Effect.fail(new ComputeUnitTaskNotCreated({ id: unit.id }));
    //         }
    //         const tid = tasks[0].id.split("_")[1];
    //         if (!tid) {
    //           return yield* Effect.fail(new ComputeUnitTaskNotCreated({ id: unit.id }));
    //         }
    //         return Cuid2Schema.make(tid);
    //       case "binary":
    //         const binaries = yield* Effect.promise(() =>
    //           db
    //             .insert(compute_binary_units)
    //             .values({
    //               download_url: unit.download_url,
    //               config: unit.config,
    //             })
    //             .returning()
    //         );
    //         if (binaries.length === 0) {
    //           return yield* Effect.fail(new ComputeUnitBinaryNotCreated());
    //         }
    //         if (!binaries[0]) {
    //           return yield* Effect.fail(new ComputeUnitBinaryNotCreated());
    //         }
    //         const bid = binaries[0].id.split("_")[1];
    //         if (!bid) {
    //           return yield* Effect.fail(new ComputeUnitBinaryNotCreated());
    //         }
    //         return Cuid2Schema.make(bid);
    //     }
    //   });

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
        if (!tasks[0]) {
          return yield* Effect.fail(new ComputeUnitTaskNotCreated({ id: task.id }));
        }
        const tid = tasks[0].id.split("_")[1];
        if (!tid) {
          return yield* Effect.fail(new ComputeUnitTaskNotCreated({ id: task.id }));
        }
        return Cuid2Schema.make(tid);
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
        if (!binaries[0]) {
          return yield* Effect.fail(new ComputeUnitBinaryNotCreated({ id: binary.id }));
        }
        const bid = binaries[0].id.split("_")[1];
        if (!bid) {
          return yield* Effect.fail(new ComputeUnitBinaryNotCreated({ id: binary.id }));
        }
        return Cuid2Schema.make(bid);
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
        if (!removed_task[0]) {
          return yield* Effect.fail(new ComputeUnitTaskNotDeleted());
        }
        const tid = removed_task[0].id.split("_")[1];
        if (!tid) {
          return yield* Effect.fail(new ComputeUnitTaskNotDeleted());
        }
        return Cuid2Schema.make(tid);
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
        if (!removed_binary[0]) {
          return yield* Effect.fail(new ComputeUnitBinaryNotDeleted());
        }
        const bid = removed_binary[0].id.split("_")[1];
        if (!bid) {
          return yield* Effect.fail(new ComputeUnitBinaryNotDeleted());
        }
        return Cuid2Schema.make(bid);
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
        if (!tasks[0]) {
          return Option.none();
        }
        return Option.some(tasks[0]!);
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
        if (!binaries[0]) {
          return Option.none();
        }

        const lp = binaries[0].local_path ?? undefined;
        return Option.some({
          ...binaries[0],
          local_path: lp,
        });
      });

    // Process tasks received from the PubSub
    const process_task = (task: ComputeTask) =>
      Effect.gen(function* (_) {
        const result_stream = runner.execute_task(task);
        const result_chunk = yield* Stream.runCollect(result_stream);
        const result_array = Chunk.toArray(result_chunk);
        return yield* Effect.succeed(result_array[0]);
      });

    const process_binary = (binary: ComputeBinary) =>
      Effect.gen(function* (_) {
        let lp = binary.local_path;
        if (!lp) {
          lp = yield* runner.prepare_binary(binary);
          // update the binary with the local path
          const b = yield* Effect.promise(() =>
            db
              .update(compute_binary_units)
              .set({
                local_path: lp,
              })
              .where(eq(compute_binary_units.id, `cbu_${binary.id}`))
              .returning()
          );
          if (b.length === 0) {
            return yield* Effect.fail(new ComputeUnitBinaryNotUpdated({ id: binary.id }));
          }
        }
        const updated_binary = ComputeBinarySchema.make({
          ...binary,
          local_path: lp,
        });

        const gather_result = Effect.gen(function* (_) {
          const result_stream = yield* runner.execute_binary(updated_binary);
          return yield* Effect.all({
            stdout: Stream.runCollect(result_stream[0]).pipe(
              Effect.map(Chunk.toArray),
              Effect.map((c) => c[0]?.slice(0, -1) ?? "")
            ),
            stderr: Stream.runCollect(result_stream[1]).pipe(
              Effect.map(Chunk.toArray),
              Effect.map((c) => c[0]?.slice(0, -1) ?? "")
            ),
            exit_code: Effect.succeed(0),
          });
        }).pipe(Effect.catchAll((e) => Effect.succeed({ stdout: "", stderr: e.message, exit_code: 1 })));

        return yield* gather_result;
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
