import * as t from "drizzle-orm/sqlite-core";
import { commonTable } from "./utils";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";

export const brokers = commonTable(
  "brokers",
  {
    // here will be parameters for the broker
    url: t.text().notNull(),
  },
  "brk"
);

export const BrokerSchema = createSelectSchema(brokers);
export type BrokerInfo = InferOutput<typeof BrokerSchema>;
