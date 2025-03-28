import { relations } from "drizzle-orm";
import * as t from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";
import { server_has_server_tag } from "./server_tags";
import { commonTable } from "./utils";
import { virtual_machines } from "./vms";

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

export const servers_relations = relations(servers, ({ one, many }) => ({
  vms: many(virtual_machines),
  server_tags: many(server_has_server_tag),
}));

export const ServerSchema = createSelectSchema(servers);
export type ServerInfo = InferOutput<typeof ServerSchema>;
