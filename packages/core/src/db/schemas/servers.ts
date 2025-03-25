import * as t from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";
import { commonTable } from "./utils";

export const servers = commonTable(
  "servers",
  {
    name: t.text().notNull(),
    url: t.text().notNull(),
    status: t
      .text({
        enum: ["available", "unavailable", "stopped", "starting", "stopping", "backing_up", "restoring", "unknown"],
      })
      .notNull()
      .default("unknown"),
  },
  "srv"
);

export const ServerSchema = createSelectSchema(servers);
export type ServerInfo = InferOutput<typeof ServerSchema>;
