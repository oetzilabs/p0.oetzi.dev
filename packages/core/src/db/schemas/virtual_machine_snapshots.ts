import * as t from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";
import { commonTable } from "./utils";
import { relations } from "drizzle-orm";
import { servers } from "./servers";
import { virtual_machines } from "./vms";

export const virtual_machine_snapshots = commonTable(
  "virtual_machine_snapshots",
  {
    vm_id: t
      .text()
      .notNull()
      .references(() => virtual_machines.id),
    server_id: t
      .text()
      .notNull()
      .references(() => servers.id),
    snapshot_path: t.text().notNull(),
    mem_file_path: t.text().notNull(),
    snapshot_type: t.text({ enum: ["Full", "Diff"] }).notNull(),
    snapshot_version: t.text().notNull(),
  },
  "vmss"
);

export const VirtualMachineSnapshotSchema = createSelectSchema(virtual_machine_snapshots);
export type VirtualMachineSnapshotInfo = InferOutput<typeof VirtualMachineSnapshotSchema>;

export const virtual_machine_snapshots_relations = relations(virtual_machine_snapshots, ({ one }) => ({
  vm: one(virtual_machines, {
    fields: [virtual_machine_snapshots.vm_id],
    references: [virtual_machines.id],
  }),
  server: one(servers, {
    fields: [virtual_machine_snapshots.server_id],
    references: [servers.id],
  }),
}));
