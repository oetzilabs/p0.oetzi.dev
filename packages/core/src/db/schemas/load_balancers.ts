import * as t from "drizzle-orm/sqlite-core";
import { commonTable } from "./utils";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";

export const load_balancers = commonTable(
  "load_balancers",
  {
    url: t.text().notNull(),
  },
  "lb"
);

export const LoadBalancerSchema = createSelectSchema(load_balancers);
export type LoadBalancerInfo = InferOutput<typeof LoadBalancerSchema>;
