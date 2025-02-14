import * as t from "drizzle-orm/sqlite-core";
import { type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { commonTable } from "./utils";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";

export const servers = commonTable(
  "servers",
  {
    name: t.text().notNull(),
    url: t.text().notNull(),
  },
  "srv"
);

export const ServerSchema = createSelectSchema(servers);
export type ServerInfo = InferOutput<typeof ServerSchema>;
