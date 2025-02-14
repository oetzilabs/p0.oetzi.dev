import { Database as BunSQLiteDatabase } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { Config, Context, Effect, Layer } from "effect";

export class Database extends Context.Tag("@p0/core/db")<Database, ReturnType<typeof drizzle>>() {}

export const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* (_) {
    const database_url = yield* Config.string("DATABASE_URL")
      .pipe(Config.withDefault("sqlite://:memory:"))
      .pipe(Effect.map((url) => url.replace("file:", "")));

    const sqlite = new BunSQLiteDatabase(database_url);

    const db = drizzle({ client: sqlite, schema: schema });

    return db;
  }),
);
