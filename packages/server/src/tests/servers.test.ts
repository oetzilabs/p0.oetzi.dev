import { Path } from "@effect/platform";
import { assert, beforeAll, describe, it } from "@effect/vitest";
import { Database, DatabaseLive } from "@p0/core/src/db";
import { ServerRepository } from "@p0/core/src/server/models/servers/repository";
import { migrate } from "drizzle-orm/libsql/migrator";
import { Config, Effect } from "effect";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";

const generate_path = (path: string, seperator: string) => path.replaceAll(/(\\|\/)/g, seperator);

describe("Servers", () => {
  beforeAll(() => {
    const program = Effect.gen(function* (_) {
      const database_url = yield* Config.string("DATABASE_TEST_URL").pipe(Config.withDefault("../../db.test.sqlite"));

      const p = yield* _(Path.Path);

      let db_file = "";
      if (p.isAbsolute(database_url)) {
        db_file = database_url;
      } else {
        db_file = p.join(process.cwd(), generate_path(database_url, p.sep));
      }

      const _exists = existsSync(db_file);
      if (_exists) {
        unlinkSync(db_file);
        writeFileSync(db_file, "", { flag: "rwx" });
      }

      const migration_folder = p.join(process.cwd(), generate_path("../core/src/db/migrations", p.sep));

      const db = yield* _(Database);

      migrate(db, { migrationsFolder: migration_folder });
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
      assert.isNotNull(server);
      assert.strictEqual(server!.name, "test");
      assert.strictEqual(server!.url, "test");
    }).pipe(Effect.provide(ServerRepository.Default))
  );

  it.sequential("allServers", () =>
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);
      const server = yield* server_repo.create({
        name: "test",
        url: "test",
      });
      assert.isNotNull(server);
      const found_server = yield* server_repo.find_by_id(server!.id);
      assert.isNotNull(found_server);
      assert.strictEqual(found_server!.name, "test");
      assert.strictEqual(found_server!.url, "test");
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
      assert.isNotNull(server);
      const found_server = yield* server_repo.find_by_id(server!.id);
      assert.isNotNull(found_server);
      assert.strictEqual(found_server!.name, "test");
      assert.strictEqual(found_server!.url, "test");
      const all_servers = yield* server_repo.all_non_deleted;
      assert.strictEqual(all_servers.length, 1);
    }).pipe(Effect.provide(ServerRepository.Default))
  );

  it.sequential("findServer", () =>
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);
      const server = yield* server_repo.find_by_name("test").pipe(
        Effect.catchTags({
          ServerNotFound: () => Effect.succeed(null),
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
          ServerNotFound: () => Effect.succeed(null),
          UnknownException: (e) => Effect.fail(e),
        })
      );
      assert.isNotNull(server);

      const removed_server = yield* server_repo.remove(server!.id);
      assert.isNotNull(removed_server);
      assert.strictEqual(removed_server!.name, "test");
      assert.strictEqual(removed_server!.url, "test");
    }).pipe(Effect.provide(ServerRepository.Default))
  );
});
