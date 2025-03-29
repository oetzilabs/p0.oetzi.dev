import { BunContext, BunFileSystem } from "@effect/platform-bun";
import {
  BootSourceNotFound,
  MachineConfigNotFound,
  NoBootSourceFileProvided,
  VirtualMachineNotFound,
} from "@p0/core/src/server/models/vms/errors";
import { VirtualMachineRepository } from "@p0/core/src/server/models/vms/repository";
import {
  CreateVirtualMachine,
  CreateVirtualMachineConfig,
  RemoveVirtualMachine,
} from "@p0/core/src/server/models/vms/schemas";
import { slugify } from "@p0/core/src/server/utils/slugify";
import { action, json, query } from "@solidjs/router";
import { Effect } from "effect";
import { findById } from "./servers";

export const create = action(async (data: CreateVirtualMachine) => {
  "use server";
  const vm = await Effect.runPromise(
    Effect.gen(function* (_) {
      const vm_repo = yield* _(VirtualMachineRepository);
      let vm;
      switch (data.type) {
        case "worker":
          break;
        case "jailed_vm":
          if (!data.image) return yield* Effect.fail(new Error("Invalid image"));
          const bs_mc = data.image.split(":");
          if (bs_mc.length !== 2) return yield* Effect.fail(new Error("Invalid image"));
          const bs = bs_mc[0];
          const mc = bs_mc[1];
          if (!bs || !mc) return yield* Effect.fail(new Error("Invalid image"));
          if (bs.length === 0) return yield* Effect.fail(new BootSourceNotFound());
          if (mc.length === 0) return yield* Effect.fail(new MachineConfigNotFound());

          const bootSource = yield* vm_repo.find_boot_source_id_by_name(bs);
          const machineConfig = yield* vm_repo.find_machine_config_id_by_name(mc);
          const createData: Parameters<typeof vm_repo.create>[0] = {
            server_id: data.server_id,
            type: data.type,
            boot_source_id: bootSource.id,
            machine_config_id: machineConfig.id,
            jailed: data.type === "jailed_vm",
          };
          vm = yield* vm_repo.create(createData);
          break;
        case "vm":
          break;
      }
      return vm;
    }).pipe(Effect.provide(VirtualMachineRepository.Default))
  );

  return vm;
});

export const configList = query(async () => {
  "use server";
  const vm_config_names_list = await Effect.runPromise(
    Effect.gen(function* (_) {
      const vm_repo = yield* _(VirtualMachineRepository);
      const vm_config_names = yield* vm_repo.vm_config_name_list;
      return vm_config_names;
    }).pipe(Effect.provide(VirtualMachineRepository.Default))
  );

  return vm_config_names_list;
}, "virtualmachine-configList");

export const createConfig = action(async (data: CreateVirtualMachineConfig) => {
  "use server";
  const vm_config = await Effect.runPromise(
    Effect.gen(function* (_) {
      const bsfile = data.bootSourceFile;
      if (!bsfile) return yield* Effect.fail(new NoBootSourceFileProvided());
      const name = `${slugify(data.bootSourceFile.name)}:${data.vcpu_count}vcpu_${data.mem_size_mib}`;
      const vm_repo = yield* _(VirtualMachineRepository);
      const vm_config = yield* vm_repo.add_vm_config(data);
      return vm_config;
    }).pipe(Effect.provide(VirtualMachineRepository.Default))
  );

  return vm_config;
});

export const seedDefaults = action(async (server_id: string) => {
  "use server";
  const vm_config = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* (_) {
        const vm_repo = yield* _(VirtualMachineRepository);
        const vm_config = yield* vm_repo.seed_defaults(server_id, true);
        return vm_config;
      }).pipe(
        Effect.provide(VirtualMachineRepository.Default),
        Effect.provide(BunFileSystem.layer),
        Effect.provide(BunContext.layer)
      )
    )
  );

  return json(vm_config, { revalidate: [configList.key, findById.keyFor(server_id)] });
});

export const remove = action(async (vm_id: RemoveVirtualMachine, server_id: string) => {
  "use server";
  const vm = await Effect.runPromise(
    Effect.gen(function* (_) {
      const vm_repo = yield* _(VirtualMachineRepository);
      const vm = yield* vm_repo.find_by_id(vm_id);
      if (!vm) return yield* Effect.fail(new VirtualMachineNotFound());
      const removed_vm = yield* vm_repo.remove(vm_id);
      return removed_vm;
    }).pipe(Effect.provide(VirtualMachineRepository.Default))
  );

  return json(vm, { revalidate: [configList.key, findById.keyFor(server_id)] });
});
