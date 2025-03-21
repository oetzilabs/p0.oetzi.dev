import * as t from "drizzle-orm/sqlite-core";
import { commonTable } from "./utils";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";

export const actors = commonTable(
  "actors",
  {
    name: t.text().notNull().unique(),
  },
  "actor"
);

export const ActorSchema = createSelectSchema(actors);
export type ActorInfo = InferOutput<typeof ActorSchema>;
