import * as t from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";
import { commonTable } from "./utils";
import { relations } from "drizzle-orm";
import { servers } from "./servers";

export const server_tags = commonTable(
  "server_tags",
  {
    title: t.text().notNull(),
    hidden: t.integer({ mode: "boolean" }).notNull().default(false),
  },
  "srvt"
);

export const ServerTagSchema = createSelectSchema(server_tags);
export type ServerTagInfo = InferOutput<typeof ServerTagSchema>;

export const server_has_server_tag = t.sqliteTable(
  "server_has_server_tag",
  {
    server_id: t
      .text()
      .notNull()
      .references(() => servers.id),
    server_tag_id: t
      .text()
      .notNull()
      .references(() => server_tags.id),
  },
  (table) => ({
    primaryKey: t.primaryKey({ columns: [table.server_id, table.server_tag_id] }),
  })
);

export const ServerHasServerTagSchema = createSelectSchema(server_has_server_tag);
export type ServerHasServerTagInfo = InferOutput<typeof ServerHasServerTagSchema>;

export const server_has_server_tag_relations = relations(server_has_server_tag, ({ one }) => ({
  server: one(servers, {
    fields: [server_has_server_tag.server_id],
    references: [servers.id],
  }),
  tag: one(server_tags, {
    fields: [server_has_server_tag.server_tag_id],
    references: [server_tags.id],
  }),
}));

export const server_tag_relations = relations(server_tags, ({ many }) => ({
  tags: many(server_has_server_tag),
}));
