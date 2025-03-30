import { relations } from "drizzle-orm";
import * as t from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";
import { server_has_server_tag } from "./server_tags";
import { commonTable } from "./utils";
import { virtual_machines } from "./vms";
import { server_terminals } from "./server_terminals";

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
    websocket_url: t.text(),
  },
  "srv"
);

export const servers_relations = relations(servers, ({ many }) => ({
  vms: many(virtual_machines),
  server_tags: many(server_has_server_tag),
  terminals: many(server_terminals),
}));

export const ServerSchema = createSelectSchema(servers);
export type ServerInfo = InferOutput<typeof ServerSchema>;
