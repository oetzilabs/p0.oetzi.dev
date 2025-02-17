// import { Database as BunSQLiteDatabase } from "bun:sqlite";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { Config, Context, Effect, Layer } from "effect";

const generate_database = (url: string) => drizzle(url, { schema });

export class Database extends Context.Tag("@p0/core/db")<Database, ReturnType<typeof generate_database>>() {}

export const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* (_) {
    const database_url = yield* Config.string("DATABASE_URL").pipe(Config.withDefault("sqlite://:memory:"));
    const db = generate_database(database_url);
    return db;
  })
);
