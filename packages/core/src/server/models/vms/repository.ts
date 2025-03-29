import { FileSystem, Path } from "@effect/platform";
import { BunContext, BunFileSystem } from "@effect/platform-bun";
import type { BootSource, MachineConfig } from "@p0/vm/src/firecracker/schema";
import { eq, isNull } from "drizzle-orm";
import { Config, Effect, Option } from "effect";
import { Database, DatabaseLive } from "../../../db";
import { boot_sources, machine_configs, virtual_machines, type VirtualMachineCreate } from "../../../db/schema";
import { get_safe_path } from "../../../utils";
import { slugify } from "../../utils/slugify";
import {
  BootSourceAlreadyExists,
  BootSourceNotFound,
  MachineConfigAlreadyExists,
  MachineConfigNotCreated,
  MachineConfigNotFound,
  NoBootSourceFileProvided,
  VirtualMachineAlreadyDeleted,
  VirtualMachineNotCreated,
  VirtualMachineNotDeleted,
  VirtualMachineNotFound,
} from "./errors";
import { RemoveVirtualMachineSchema, type CreateVirtualMachineConfig } from "./schemas";

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

    const ensure_boot_source_does_not_exist = (name: string) =>
      Effect.gen(function* (_) {
        const bs_id = yield* find_boot_source_id_by_name(name);
        if (bs_id) return yield* Effect.succeed(true);
        return yield* Effect.succeed(false);
      });

    const add_vm_config = (data: CreateVirtualMachineConfig) =>
      Effect.gen(function* () {
        const transaction = yield* Effect.tryPromise(() =>
          db.transaction(async (tx) => {
            const x = await Effect.runPromise(
              Effect.gen(function* (_) {
                const newMc = {
                  mem_size_mib: data.mem_size_mib,
                  vcpu_count: data.vcpu_count,
                  name: `${data.vcpu_count}vcpu_${data.mem_size_mib}`,
                };
                const mc_id = yield* Effect.tryPromise(() => tx.insert(machine_configs).values([newMc]).returning());
                if (!mc_id) return yield* Effect.fail(new MachineConfigNotCreated());
                if (mc_id.length !== 1) return yield* Effect.fail(new MachineConfigNotCreated());
                const mc = mc_id[0];
                if (!mc) return yield* Effect.fail(new MachineConfigNotCreated());
                const bsfile = data.bootSourceFile;
                if (!bsfile) return yield* Effect.fail(new NoBootSourceFileProvided());
                const slugified = slugify(bsfile.name);
                let bs_exists = yield* ensure_boot_source_does_not_exist(slugified);
                if (bs_exists) return yield* Effect.fail(new BootSourceAlreadyExists({ name: slugified }));
                const buffer = yield* Effect.tryPromise(() => bsfile.arrayBuffer());
                // save the file to the filesystem
                const fs = yield* _(FileSystem.FileSystem);
                const path = yield* _(Path.Path);
                const starting_dir = yield* Config.string("FIRECRACKER_SETUP_DIR").pipe(
                  Config.withDefault("./prepare")
                );
                const p = yield* get_safe_path(path.join(starting_dir, "filesystem-collection", slugify(bsfile.name)));
                yield* fs.writeFile(p, Uint8Array.from(Buffer.from(buffer)));
                const newBs = Effect.tryPromise(() =>
                  tx
                    .insert(boot_sources)
                    .values([{ name: slugify(bsfile.name), kernel_image_path: p }])
                    .returning()
                );
                const bs_id = yield* newBs;
                if (!bs_id) return yield* Effect.fail(new BootSourceNotFound());
                if (bs_id.length !== 1) return yield* Effect.fail(new BootSourceNotFound());
                const bs = bs_id[0];
                if (!bs) return yield* Effect.fail(new BootSourceNotFound());
                if (!bs.id) return yield* Effect.fail(new BootSourceNotFound());
                if (!mc.id) return yield* Effect.fail(new MachineConfigNotCreated());

                const vm_configs = yield* Effect.tryPromise(() =>
                  tx
                    .insert(virtual_machines)
                    .values([
                      {
                        server_id: data.server_id,
                        boot_source_id: bs.id,
                        machine_config_id: mc.id,
                      },
                    ])
                    .returning()
                );
                if (vm_configs.length !== 1) return yield* Effect.fail(new VirtualMachineNotCreated());
                const vm_c = vm_configs[0];
                if (!vm_c) return yield* Effect.fail(new VirtualMachineNotCreated());
                return Option.some({ vm: vm_c, mc: mc });
              }).pipe(
                Effect.catchAll(() => Option.none()),
                Effect.provide(BunFileSystem.layer),
                Effect.provide(BunContext.layer)
              )
            );
            if (Option.isNone(x)) return tx.rollback();
            return x.value;
          })
        );
        return transaction;
      });

    const vm_configurator = (
      config: {
        machine: MachineConfig & { name: string };
        bootSource: BootSource & { name: string };
        server_id: string;
      },
      skip_checks: boolean = false
    ) =>
      Effect.gen(function* (_) {
        const p = Effect.tryPromise(() =>
          db.transaction(async (tx) => {
            const x = await Effect.runPromise(
              Effect.gen(function* (_) {
                const fs = yield* _(FileSystem.FileSystem);
                const path = yield* _(Path.Path);
                const mc_exists = yield* Effect.tryPromise(() =>
                  tx.select().from(machine_configs).where(eq(machine_configs.name, config.machine.name)).execute()
                );
                if (mc_exists.length > 0)
                  return yield* Effect.fail(new MachineConfigAlreadyExists({ name: config.machine.name }));

                const mc_id = yield* Effect.tryPromise(() =>
                  tx.insert(machine_configs).values([config.machine]).returning()
                );
                if (!mc_id) return yield* Effect.fail(new MachineConfigNotCreated());
                if (mc_id.length !== 1) return yield* Effect.fail(new MachineConfigNotCreated());
                const mc = mc_id[0];
                if (!mc) return yield* Effect.fail(new MachineConfigNotCreated());

                const starting_dir = yield* Config.string("FIRECRACKER_SETUP_DIR").pipe(
                  Config.withDefault("./prepare")
                );
                if (!skip_checks) {
                  const bsFilePath = yield* get_safe_path(
                    path.join(starting_dir, "filesystem-collection", "ubuntu-22.04.ext4")
                  );
                  const bsFileExists = yield* fs.exists(bsFilePath);
                  if (!bsFileExists) return yield* Effect.fail(new BootSourceNotFound());
                }
                const bs_exists = yield* Effect.tryPromise(() =>
                  tx.select().from(boot_sources).where(eq(boot_sources.name, config.bootSource.name)).execute()
                );
                if (bs_exists.length > 0)
                  return yield* Effect.fail(new BootSourceAlreadyExists({ name: config.bootSource.name }));

                const newBs = Effect.tryPromise(() => tx.insert(boot_sources).values([config.bootSource]).returning());
                const bs_id = yield* newBs;
                if (!bs_id) return yield* Effect.fail(new BootSourceNotFound());
                if (bs_id.length !== 1) return yield* Effect.fail(new BootSourceNotFound());
                const bs = bs_id[0];
                if (!bs) return yield* Effect.fail(new BootSourceNotFound());

                const vm_configs = yield* Effect.tryPromise(() =>
                  tx
                    .insert(virtual_machines)
                    .values([
                      {
                        boot_source_id: bs.id,
                        server_id: config.server_id,
                        machine_config_id: mc.id,
                      },
                    ])
                    .returning()
                );

                if (vm_configs.length !== 1) return yield* Effect.fail(new VirtualMachineNotCreated());
                const vm_c = vm_configs[0];
                if (!vm_c) return yield* Effect.fail(new VirtualMachineNotCreated());
                return Option.some({ vm: vm_c, mc: mc });
              }).pipe(
                Effect.catchTags({
                  UnknownException: (e) => Effect.fail(VirtualMachineNotCreated.make({ message: e.message })),
                }),
                // Effect.catchAll((e) => Option.none()),
                Effect.provide(BunFileSystem.layer),
                Effect.provide(BunContext.layer)
              )
            );
            if (Option.isNone(x)) {
              console.log("something went wrong rolling back");
              return tx.rollback();
            }
            return x.value;
          })
        );
        return yield* p;
      });

    const seed_defaults = (server_id: string, skip_checks: boolean = false) =>
      Effect.gen(function* (_) {
        const fs = yield* _(FileSystem.FileSystem);
        const path = yield* _(Path.Path);
        const starting_dir = yield* Config.string("FIRECRACKER_SETUP_DIR").pipe(Config.withDefault("./prepare"));
        const bsFilePath = yield* get_safe_path(path.join(starting_dir, "filesystem-collection", "rootfs.ext4"));
        if (!skip_checks) {
          const bsFileExists = yield* fs.exists(bsFilePath);
          if (!bsFileExists) return yield* Effect.fail(new BootSourceNotFound());
        }
        const transaction = yield* vm_configurator(
          {
            bootSource: {
              kernel_image_path: bsFilePath,
              boot_args: "console=ttyS0 noapic reboot=k panic=1 pci=off nomodules",
              name: "default",
            },
            machine: { mem_size_mib: 128, vcpu_count: 1, name: "default" },
            server_id,
          },
          skip_checks
        );
        return transaction;
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
      add_vm_config,
      seed_defaults,
      vm_configurator,
    } as const;
  }),
  dependencies: [DatabaseLive],
}) {}
