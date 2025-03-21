import * as t from "drizzle-orm/sqlite-core";
import { commonTable } from "./utils";
import { createSelectSchema } from "drizzle-valibot";
import type { InferOutput } from "valibot";
import { actors } from "./actors";

export const sessions = commonTable(
  "sessions",
  {
    bearer_token: t.text().notNull(),
    actor_id: t
      .text()
      .notNull()
      .references(() => actors.id),
  },
  "session"
);

export const SessionSchema = createSelectSchema(sessions);
export type SessionInfo = InferOutput<typeof SessionSchema>;
