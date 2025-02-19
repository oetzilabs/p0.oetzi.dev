import { Path } from "@effect/platform";
import { assert, beforeAll, describe, it } from "@effect/vitest";
import { Database, DatabaseLive } from "@p0/core/src/db";
import { ActorRepository } from "@p0/core/src/server/models/actors/repository";
import { migrate } from "drizzle-orm/libsql/migrator";
import { Config, Effect } from "effect";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";

const generate_path = (path: string, seperator: string) => path.replaceAll(/(\\|\/)/g, seperator);

describe("Actors", () => {
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

  it.sequential("createActor", () =>
    Effect.gen(function* (_) {
      const actor_repo = yield* _(ActorRepository);
      const actor = yield* actor_repo.create({
        name: "test",
      });
      assert.isNotNull(actor);
      assert.strictEqual(actor!.name, "test");
    }).pipe(Effect.provide(ActorRepository.Default))
  );

  it.sequential("allActors", () =>
    Effect.gen(function* (_) {
      const actor_repo = yield* _(ActorRepository);
      const actor = yield* actor_repo.create({
        name: "test",
      });
      assert.isNotNull(actor);
      const found_actor = yield* actor_repo.find_by_id(actor!.id);
      assert.isNotNull(found_actor);
      assert.strictEqual(found_actor!.name, "test");
      const all_actors = yield* actor_repo.all;
      assert.strictEqual(all_actors.length, 1);
    }).pipe(Effect.provide(ActorRepository.Default))
  );

  it.sequential("allNonDeletedActors", () =>
    Effect.gen(function* (_) {
      const actor_repo = yield* _(ActorRepository);
      const actor = yield* actor_repo.create({
        name: "test",
      });
      assert.isNotNull(actor);
      const found_actor = yield* actor_repo.find_by_id(actor!.id);
      assert.isNotNull(found_actor);
      assert.strictEqual(found_actor!.name, "test");
      const all_actors = yield* actor_repo.all_non_deleted;
      assert.strictEqual(all_actors.length, 1);
    }).pipe(Effect.provide(ActorRepository.Default))
  );

  it.sequential("findActor", () =>
    Effect.gen(function* (_) {
      const actor_repo = yield* _(ActorRepository);
      const actor = yield* actor_repo.find_by_name("test").pipe(
        Effect.catchTags({
          ActorNotFound: () => Effect.succeed(null),
          UnknownException: (e) => Effect.fail(e),
        })
      );
      assert.isNotNull(actor);
      assert.strictEqual(actor!.name, "test");
    }).pipe(Effect.provide(ActorRepository.Default))
  );

  it.sequential("removeActor", () =>
    Effect.gen(function* (_) {
      const actor_repo = yield* _(ActorRepository);
      const actor = yield* actor_repo.find_by_name("test").pipe(
        Effect.catchTags({
          ActorNotFound: () => Effect.succeed(null),
          UnknownException: (e) => Effect.fail(e),
        })
      );
      assert.isNotNull(actor);

      const removed_actor = yield* actor_repo.remove(actor!.id);
      assert.isNotNull(removed_actor);
      assert.strictEqual(removed_actor!.name, "test");
    }).pipe(Effect.provide(ActorRepository.Default))
  );
});
