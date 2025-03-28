import { eq, isNull } from "drizzle-orm";
import { Effect } from "effect";
import { Database, DatabaseLive } from "../../../db";
import { boot_sources, machine_configs, virtual_machines, type VirtualMachineCreate } from "../../../db/schema";
import {
  BootSourceNotFound,
  MachineConfigNotFound,
  VirtualMachineAlreadyDeleted,
  VirtualMachineNotCreated,
  VirtualMachineNotDeleted,
  VirtualMachineNotFound,
} from "./errors";
import { RemoveVirtualMachineSchema, type CreateVirtualMachine } from "./schemas";

export class VirtualMachineRepository extends Effect.Service<VirtualMachineRepository>()("@p0/core/vm/repo", {
  effect: Effect.gen(function* (_) {
    const db = yield* _(Database);
    const create = (body: VirtualMachineCreate) =>
      Effect.gen(function* (_) {
        const create_virtual_machine = Effect.tryPromise(() => db.insert(virtual_machines).values([body]).returning());
        const _virtual_machines = yield* create_virtual_machine;
        if (_virtual_machines.length !== 1) return yield* Effect.fail(new VirtualMachineNotCreated());
        const virtual_machine = _virtual_machines[0];
        if (!virtual_machine) return yield* Effect.fail(new VirtualMachineNotCreated());
        return yield* Effect.succeed(virtual_machine);
      });

    const remove = (id: typeof RemoveVirtualMachineSchema.Type) =>
      Effect.gen(function* (_) {
        const _virtual_machines = yield* Effect.tryPromise(() =>
          db.select().from(virtual_machines).where(eq(virtual_machines.id, id)).limit(1).execute()
        );
        if (_virtual_machines.length !== 1) return yield* Effect.fail(new VirtualMachineNotFound());
        const _virtual_machine = _virtual_machines[0];
        if (!_virtual_machine) return yield* Effect.fail(new VirtualMachineNotFound());
        if (_virtual_machine.deletedAt) return yield* Effect.fail(new VirtualMachineAlreadyDeleted());
        const removed_virtual_machines = yield* Effect.tryPromise(() =>
          db.delete(virtual_machines).where(eq(virtual_machines.id, _virtual_machine.id)).returning()
        );
        if (removed_virtual_machines.length !== 1) return yield* Effect.fail(new VirtualMachineNotDeleted());
        const virtual_machine = removed_virtual_machines[0];
        if (!virtual_machine) return yield* Effect.fail(new VirtualMachineNotDeleted());
        return yield* Effect.succeed(virtual_machine);
      });

    const all_non_deleted = Effect.gen(function* (_) {
      const _virtual_machines = yield* Effect.tryPromise(() =>
        db.select().from(virtual_machines).where(isNull(virtual_machines.deletedAt)).execute()
      );
      return _virtual_machines;
    });

    const all = Effect.gen(function* (_) {
      const get_virtual_machines = Effect.tryPromise(() => db.select().from(virtual_machines).execute());
      const _virtual_machines = yield* get_virtual_machines;
      return _virtual_machines;
    });

    const find_by_id = (id: string) =>
      Effect.gen(function* (_) {
        const get_virtual_machine = Effect.tryPromise(() =>
          db.query.virtual_machines
            .findFirst({
              where: (fields, operators) => operators.eq(fields.id, id),
              with: {
                server: true,
              },
            })
            .execute()
        );
        const virtual_machine = yield* get_virtual_machine;
        if (!virtual_machine) return yield* Effect.fail(new VirtualMachineNotFound());
        return yield* Effect.succeed(virtual_machine);
      });

    const find_boot_source_id_by_name = (name: string) =>
      Effect.gen(function* (_) {
        const get_boot_source = Effect.tryPromise(() =>
          db.query.boot_sources
            .findFirst({
              where: (fields, operators) => operators.eq(fields.name, name),
              with: {
                server: true,
              },
            })
            .execute()
        );
        const boot_source = yield* get_boot_source;
        if (!boot_source) return yield* Effect.fail(new BootSourceNotFound());
        return yield* Effect.succeed(boot_source);
      });

    const find_machine_config_id_by_name = (name: string) =>
      Effect.gen(function* (_) {
        const get_machine_config = Effect.tryPromise(() =>
          db.query.machine_configs
            .findFirst({
              where: (fields, operators) => operators.eq(fields.name, name),
              with: {
                server: true,
              },
            })
            .execute()
        );
        const machine_config = yield* get_machine_config;
        if (!machine_config) return yield* Effect.fail(new MachineConfigNotFound());
        return yield* Effect.succeed(machine_config);
      });

    const all_machine_configs = Effect.gen(function* (_) {
      const get_machine_configs = Effect.tryPromise(() => db.select().from(machine_configs).execute());
      const _machine_configs = yield* get_machine_configs;
      return _machine_configs;
    });

    const all_boot_sources = Effect.gen(function* (_) {
      const get_boot_sources = Effect.tryPromise(() => db.select().from(boot_sources).execute());
      const _boot_sources = yield* get_boot_sources;
      return _boot_sources;
    });

    const vm_config_name_list = Effect.gen(function* (_) {
      // combination of boot_sources and machine_configs
      const bss = yield* all_boot_sources;
      const mcs = yield* all_machine_configs;
      const vm_config_names = bss.map((bs) => mcs.map((mc) => `${bs.name}:${mc.name}`)).flat();
      return yield* Effect.succeed(vm_config_names);
    });

    return {
      create,
      remove,
      all_non_deleted,
      all,
      find_by_id,
      find_boot_source_id_by_name,
      find_machine_config_id_by_name,
      vm_config_name_list,
      all_boot_sources,
      all_machine_configs,
    } as const;
  }),
  dependencies: [DatabaseLive],
}) {}
