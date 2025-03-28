import { action, query } from "@solidjs/router";
import { Effect } from "effect";
import { ServerRepository } from "@p0/core/src/server/models/servers/repository";
import { VirtualMachineRepository } from "@p0/core/src/server/models/vms/repository";
import { type CreateServer } from "@p0/core/src/server/models/servers/schemas";
import { FirecrackerLive } from "@p0/vm/src/firecracker";
import { runner } from "@p0/vm/src";
import { BunContext, BunFileSystem } from "@effect/platform-bun";
import { CreateVirtualMachine } from "@p0/core/src/server/models/vms/schemas";
import { BootSourceNotFound, MachineConfigNotFound } from "@p0/core/src/server/models/vms/errors";

export const list = query(async () => {
  "use server";

  const program = Effect.gen(function* (_) {
    const server_repo = yield* _(ServerRepository);
    const servers = yield* server_repo.all;
    return servers;
  }).pipe(Effect.provide(ServerRepository.Default));

  const servers = await Effect.runPromise(program);

  return servers;
}, "list-servers");

export const create = action(async (data: CreateServer) => {
  "use server";
  const server = await Effect.runPromise(
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);
      const server = yield* server_repo.create(data);
      return server;
    }).pipe(Effect.provide(ServerRepository.Default))
  );

  return server;
});

export const findById = query(async (id: string) => {
  "use server";
  const server = await Effect.runPromise(
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);
      const server = yield* server_repo.find_by_id(id);
      return server;
    }).pipe(Effect.provide(ServerRepository.Default))
  );

  return server;
}, "find-server-by-id");

export const findByName = query(async (name: string) => {
  "use server";
  const server = await Effect.runPromise(
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);
      const server = yield* server_repo.find_by_name(name);
      return server;
    }).pipe(Effect.provide(ServerRepository.Default))
  );

  return server;
}, "find-server-by-name");

export const createVirtualMachine = action(async (data: CreateVirtualMachine) => {
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

export const getVirtualMachineConfigList = query(async () => {
  "use server";
  const vm_config_names_list = await Effect.runPromise(
    Effect.gen(function* (_) {
      const vm_repo = yield* _(VirtualMachineRepository);
      const vm_config_names = yield* vm_repo.vm_config_name_list;
      return vm_config_names;
    }).pipe(Effect.provide(VirtualMachineRepository.Default))
  );

  return vm_config_names_list;
}, "getVirtualMachineConfigList");
