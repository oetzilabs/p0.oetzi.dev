import { Path } from "@effect/platform";
import { assert, beforeAll, beforeEach, describe, it } from "@effect/vitest";
import { Database, DatabaseLive } from "@p0/core/src/db";
import { ServerRepository } from "@p0/core/src/entities/server/repository";
import { migrate } from "drizzle-orm/libsql/migrator";
import { Effect } from "effect";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";

describe("Servers", () => {
  beforeAll(() => {
    const program = Effect.gen(function* (_) {
      // remove the database file
      const p = yield* _(Path.Path);
      const db_file = p.join(process.cwd(), "../../db.test.sqlite");
      console.log("db_file", db_file);
      // check if the file exists
      const _exists = existsSync(db_file);
      if (_exists) {
        unlinkSync(db_file);
        writeFileSync(db_file, "", { flag: "rwx" });
      }
      const migration_folder_path = p.join(process.cwd(), "../core/src/db/migrations");
      const db = yield* _(Database);
      migrate(db, { migrationsFolder: migration_folder_path });
    }).pipe(Effect.provide(DatabaseLive), Effect.provide(Path.layer));
    Effect.runFork(program);
  });
  it.sequential("createServer", () =>
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);
      const server = yield* server_repo.create({
        name: "test",
        url: "test",
      });

      assert.strictEqual(server.name, "test");
      assert.strictEqual(server.url, "test");
    }).pipe(Effect.provide(ServerRepository.Default))
  );
  it.sequential("findServer", () =>
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);
      const server = yield* server_repo.find_by_name("test").pipe(
        Effect.catchTags({
          ServerNotFound: (e) => Effect.succeed(null),
          UnknownException: (e) => Effect.fail(e),
        })
      );
      assert.isNotNull(server);
      assert.strictEqual(server!.name, "test");
      assert.strictEqual(server!.url, "test");
    }).pipe(Effect.provide(ServerRepository.Default))
  );
  it.sequential("removeServer", () =>
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);
      const server = yield* server_repo.find_by_name("test").pipe(
        Effect.catchTags({
          ServerNotFound: (e) => Effect.succeed(null),
          UnknownException: (e) => Effect.fail(e),
        })
      );
      assert.isNotNull(server);

      const removed_server = yield* server_repo.remove(server!.id);
      assert.strictEqual(removed_server.name, "test");
      assert.strictEqual(removed_server.url, "test");
    }).pipe(Effect.provide(ServerRepository.Default))
  );
  it.sequential("allServers", () =>
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);
      const server = yield* server_repo.create({
        name: "test",
        url: "test",
      });
      const found_server = yield* server_repo.find_by_id(server.id);
      assert.strictEqual(found_server.name, "test");
      assert.strictEqual(found_server.url, "test");
      const all_servers = yield* server_repo.all;
      assert.strictEqual(all_servers.length, 1);
    }).pipe(Effect.provide(ServerRepository.Default))
  );
  it.sequential("allNonDeletedServers", () =>
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);
      const server = yield* server_repo.create({
        name: "test",
        url: "test",
      });
      const found_server = yield* server_repo.find_by_id(server.id);
      assert.strictEqual(found_server.name, "test");
      assert.strictEqual(found_server.url, "test");
      const all_servers = yield* server_repo.all_non_deleted;
      assert.strictEqual(all_servers.length, 1);
    }).pipe(Effect.provide(ServerRepository.Default))
  );
});
