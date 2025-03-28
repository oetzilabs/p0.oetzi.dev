import * as t from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";
import { commonTable } from "./utils";

export const machine_configs = commonTable(
  "machine_configs",
  {
    name: t.text().notNull().unique(),
    vcpu_count: t.integer().notNull(),
    mem_size_mib: t.integer().notNull(),
  },
  "mc"
);

export const MachineConfigSchema = createSelectSchema(machine_configs);
export type MachineConfigInfo = InferOutput<typeof MachineConfigSchema>;
