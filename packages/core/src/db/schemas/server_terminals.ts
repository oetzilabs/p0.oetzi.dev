import * as t from "drizzle-orm/sqlite-core";
import { commonTable } from "./utils";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";
import { servers } from "./servers";
import { relations } from "drizzle-orm";

export const server_terminals = commonTable(
  "server_terminals",
  {
    link: t.text().notNull(),
    server_id: t
      .text()
      .notNull()
      .references(() => servers.id),
  },
  "st"
);

export const ServerTerminalSchema = createSelectSchema(server_terminals);
export type ServerTerminalInfo = InferOutput<typeof ServerTerminalSchema>;

export const server_terminals_relations = relations(server_terminals, ({ one }) => ({
  server: one(servers, {
    fields: [server_terminals.server_id],
    references: [servers.id],
  }),
}));
