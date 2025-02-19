import { eq, isNull } from "drizzle-orm";
import { Effect, Redacted } from "effect";
import { Database, DatabaseLive } from "../../../db";
import { actors, sessions } from "../../../db/schema";
import {
  SessionAlreadyDeleted,
  SessionAlreadyExists,
  SessionNotCreated,
  SessionNotDeleted,
  SessionNotFound,
} from "./errors";
import { CreateSessionSchema, RemoveSessionSchema } from "./schemas";
import * as crypto from "node:crypto";
import { HttpApiBuilder, HttpApiSecurity } from "@effect/platform";

export class SessionRepository extends Effect.Service<SessionRepository>()("@p0/core/session/repo", {
  effect: Effect.gen(function* (_) {
    const db = yield* _(Database);
    const create = (body: typeof CreateSessionSchema.Type) =>
      Effect.gen(function* (_) {
        const exists = yield* Effect.tryPromise(() =>
          db.select({ id: sessions.id }).from(sessions).where(eq(sessions.actor_id, body.actor_id)).execute()
        );

        if (exists.length !== 0) return yield* Effect.fail(new SessionAlreadyExists());
        const bearer_token = crypto.randomBytes(32).toString("hex");
        yield* Effect.log("creating session", bearer_token);

        const create_session = Effect.tryPromise(() =>
          db
            .insert(sessions)
            .values([Object.assign(body, { bearer_token })])
            .returning()
        );

        const _sessions = yield* create_session;

        if (_sessions.length !== 1) return yield* Effect.fail(new SessionNotCreated());
        yield* Effect.log("created session", _sessions[0]);
        return yield* Effect.succeed(_sessions[0]);
      });

    const remove = (id: typeof RemoveSessionSchema.Type) =>
      Effect.gen(function* (_) {
        // const repo = yield* _(SessionRepository);

        const _sessions = yield* Effect.tryPromise(() =>
          db.select().from(sessions).where(eq(sessions.id, id)).limit(1).execute()
        );

        if (_sessions.length !== 1) return yield* Effect.fail(new SessionNotFound());

        const _session = _sessions[0];

        if (!_session) return yield* Effect.fail(new SessionNotFound());

        if (_session.deletedAt) return yield* Effect.fail(new SessionAlreadyDeleted());

        const removed_sessions = yield* Effect.tryPromise(() =>
          db.delete(sessions).where(eq(sessions.id, _session.id)).returning()
        );

        if (removed_sessions.length !== 1) return yield* Effect.fail(new SessionNotDeleted());

        return yield* Effect.succeed(removed_sessions[0]);
      });

    const all_non_deleted = Effect.gen(function* (_) {
      const _sessions = yield* Effect.tryPromise(() =>
        db.select().from(sessions).where(isNull(sessions.deletedAt)).execute()
      );
      return _sessions;
    });

    const all = Effect.gen(function* (_) {
      const get_sessions = Effect.tryPromise(() => db.select().from(sessions).execute());

      const _sessions = yield* get_sessions;

      return _sessions;
    });

    const find_by_id = (id: string) =>
      Effect.gen(function* (_) {
        const get_session = Effect.tryPromise(() =>
          db.select().from(sessions).where(eq(sessions.id, id)).limit(1).execute()
        );
        const _sessions = yield* get_session;
        if (_sessions.length !== 1) return yield* Effect.fail(new SessionNotFound());
        return yield* Effect.succeed(_sessions[0]);
      });
    const find_by_bearer_token = (bearer_token: string) =>
      Effect.gen(function* (_) {
        const get_session = Effect.tryPromise(() =>
          db
            .select()
            .from(sessions)
            .where(eq(sessions.bearer_token, bearer_token))
            .limit(1)
            .leftJoin(actors, eq(sessions.actor_id, actors.id))
        );
        const _sessions = yield* get_session;
        if (_sessions.length !== 1) return yield* Effect.fail(new SessionNotFound());
        return yield* Effect.succeed(_sessions[0]);
      });

    return {
      create,
      remove,
      all_non_deleted,
      all,
      find_by_id,
      find_by_bearer_token,
    } as const;
  }),
  dependencies: [DatabaseLive],
}) {}
