import * as t from "drizzle-orm/sqlite-core";
import { servers } from "./servers";
import { brokers } from "./brokers";

export const server_brokers = t.sqliteTable(
  "server_brokers",
  {
    server_id: t
      .text("server_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    broker_id: t
      .text("broker_id")
      .notNull()
      .references(() => brokers.id, { onDelete: "cascade" }),
  },
  (table) => [t.uniqueIndex("server_brokers_uid").on(table.server_id, table.broker_id)]
);
