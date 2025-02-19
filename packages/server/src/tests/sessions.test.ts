import { Path } from "@effect/platform";
import { assert, beforeAll, beforeEach, describe, it } from "@effect/vitest";
import { Database, DatabaseLive } from "@p0/core/src/db";
import { ActorRepository } from "@p0/core/src/server/models/actors/repository";
import { SessionRepository } from "@p0/core/src/server/models/sessions/repository";
import { migrate } from "drizzle-orm/libsql/migrator";
import { Config, Effect } from "effect";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";

const generate_path = (path: string, seperator: string) => path.replaceAll(/(\\|\/)/g, seperator);

describe("Sessions", () => {
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

  it.sequential("createSession", () =>
    Effect.gen(function* (_) {
      const actor_repo = yield* _(ActorRepository);
      const actor = yield* actor_repo.create({
        name: "test_actor",
      });
      assert.isNotEmpty(actor!.name);
      const session_repo = yield* _(SessionRepository);
      const session = yield* session_repo.create({
        actor_id: actor!.id,
      });
      assert.isNotEmpty(session!.bearer_token);
      assert.isNotEmpty(session!.actor_id);
    }).pipe(Effect.provide(SessionRepository.Default), Effect.provide(ActorRepository.Default))
  );

  it.sequential("allSessions", () =>
    Effect.gen(function* (_) {
      const actor_repo = yield* _(ActorRepository);
      const actor = yield* actor_repo.create({
        name: "test_actor",
      });
      assert.isNotEmpty(actor!.name);
      const session_repo = yield* _(SessionRepository);
      const session = yield* session_repo.create({
        actor_id: actor!.id,
      });
      assert.isNotEmpty(session!.bearer_token);
      assert.isNotEmpty(session!.actor_id);
      const all_sessions = yield* session_repo.all;
      assert.isAtLeast(all_sessions.length, 1);
    }).pipe(Effect.provide(SessionRepository.Default), Effect.provide(ActorRepository.Default))
  );

  it.sequential("allNonDeletedSessions", () =>
    Effect.gen(function* (_) {
      const actor_repo = yield* _(ActorRepository);
      const actor = yield* actor_repo.create({
        name: "test_actor",
      });
      assert.isNotEmpty(actor!.name);
      const session_repo = yield* _(SessionRepository);
      const session = yield* session_repo.create({
        actor_id: actor!.id,
      });
      assert.isNotEmpty(session!.bearer_token);
      assert.isNotEmpty(session!.actor_id);
      const all_sessions = yield* session_repo.all_non_deleted;
      assert.isAtLeast(all_sessions.length, 1);
    }).pipe(Effect.provide(SessionRepository.Default), Effect.provide(ActorRepository.Default))
  );

  it.sequential("findSessionById", () =>
    Effect.gen(function* (_) {
      const actor_repo = yield* _(ActorRepository);
      const actor = yield* actor_repo.create({
        name: "test_actor",
      });
      assert.isNotEmpty(actor!.name);
      const session_repo = yield* _(SessionRepository);
      const s = yield* session_repo.create({
        actor_id: actor!.id,
      });
      assert.isNotEmpty(s!.bearer_token);
      assert.isNotEmpty(s!.actor_id);

      const session = yield* session_repo.find_by_id(s.id);
      assert.isNotNull(session);
      assert.isNotEmpty(session!.bearer_token);
      assert.isNotEmpty(session!.actor_id);
    }).pipe(Effect.provide(SessionRepository.Default), Effect.provide(ActorRepository.Default))
  );

  it.sequential("removeSession", () =>
    Effect.gen(function* (_) {
      const actor_repo = yield* _(ActorRepository);
      const actor = yield* actor_repo.create({
        name: "test_actor",
      });
      assert.isNotEmpty(actor!.name);
      const session_repo = yield* _(SessionRepository);
      const s = yield* session_repo.create({
        actor_id: actor!.id,
      });
      assert.isNotEmpty(s!.bearer_token);
      assert.isNotEmpty(s!.actor_id);
      const removed_session = yield* session_repo.safe_delete(s.id);

      assert.isNotNull(removed_session);
      assert.isNotEmpty(removed_session!.bearer_token);
      assert.strictEqual(removed_session!.actor_id, actor!.id);
    }).pipe(Effect.provide(SessionRepository.Default), Effect.provide(ActorRepository.Default))
  );
});
