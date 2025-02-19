import * as t from "drizzle-orm/sqlite-core";
import { servers } from "./servers";
import { brokers } from "./brokers";

export const brokers_load_balancers = t.sqliteTable(
  "brokers_load_balancers",
  {
    broker_id: t
      .text("broker_id")
      .notNull()
      .references(() => brokers.id, { onDelete: "cascade" }),
    load_balancer_id: t
      .text("load_balancer_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
  },
  (table) => [t.uniqueIndex("brokers_load_balancers_uid").on(table.broker_id, table.load_balancer_id)]
);
