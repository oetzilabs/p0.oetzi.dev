import { env } from "bun";
import { defineConfig } from "drizzle-kit";
import { check } from "./src/db/check";

const { DATABASE_URL } = check();

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
