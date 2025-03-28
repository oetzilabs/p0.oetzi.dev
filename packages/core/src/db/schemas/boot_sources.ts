import * as t from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";
import { commonTable } from "./utils";

export const boot_sources = commonTable(
  "boot_sources",
  {
    name: t.text().notNull().unique(),
    kernel_image_path: t.text().notNull(),
    initrd_path: t.text(),
    boot_args: t.text(),
  },
  "bs"
);

export const BootSourceSchema = createSelectSchema(boot_sources);
export type BootSourceInfo = InferOutput<typeof BootSourceSchema>;
