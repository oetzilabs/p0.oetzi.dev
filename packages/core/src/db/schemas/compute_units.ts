import * as t from "drizzle-orm/sqlite-core";
import { commonTable } from "./utils";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";
import type { ComputeBinary, ComputeTask } from "../../compute/schemas";

export const compute_task_units = commonTable(
  "compute_task_units",
  {
    // here will be parameters for the compute binary unit
    config: t.blob({ mode: "json" }).$type<ComputeTask["config"]>().notNull(),
  },
  "ctu"
);

export const compute_binary_units = commonTable(
  "compute_binary_units",
  {
    // here will be parameters for the compute binary unit
    config: t.blob({ mode: "json" }).$type<ComputeBinary["config"]>().notNull(),
    download_url: t.text().notNull(),
    local_path: t.text(),
  },
  "cbu"
);

export const ComputeTaskSchema = createSelectSchema(compute_task_units);
export type ComputeTaskInfo = InferOutput<typeof ComputeTaskSchema>;
