import * as t from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";
import { commonTable } from "./utils";
import { boot_sources } from "./boot_sources";
import { machine_configs } from "./machine_configs";
import { servers } from "./servers";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-valibot";
import { virtual_machine_snapshots } from "./virtual_machine_snapshots";

export const virtual_machines = commonTable(
  "virtual_machines",
  {
    server_id: t
      .text()
      .notNull()
      .references(() => servers.id),
    type: t
      .text({ enum: ["worker", "jailed_vm", "vm"] })
      .notNull()
      .default("jailed_vm"),
    jailed: t.integer({ mode: "boolean" }).notNull().default(true),
    boot_source_id: t
      .text()
      .notNull()
      .references(() => boot_sources.id),
    machine_config_id: t
      .text()
      .notNull()
      .references(() => machine_configs.id),
    status: t
      .text({
        enum: [
          "idle",
          "stopped",
          "starting",
          "stopping",
          "backing_up", // snapshot
          "restoring", // recovery from snapshot
          "unknown",
        ],
      })
      .default("unknown"),
  },
  "vm"
);

export const virtual_machines_relations = relations(virtual_machines, ({ one, many }) => ({
  server: one(servers, { fields: [virtual_machines.server_id], references: [servers.id] }),
  boot_source: one(boot_sources, { fields: [virtual_machines.boot_source_id], references: [boot_sources.id] }),
  machine_config: one(machine_configs, {
    fields: [virtual_machines.machine_config_id],
    references: [machine_configs.id],
  }),
  snapshots: many(virtual_machine_snapshots),
}));

export const VirtualMachineSchema = createSelectSchema(virtual_machines);
export type VirtualMachineInfo = InferOutput<typeof VirtualMachineSchema>;

export const VirtualMachineCreateSchema = createInsertSchema(virtual_machines);
export type VirtualMachineCreate = InferOutput<typeof VirtualMachineCreateSchema>;
