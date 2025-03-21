import { and, eq, isNull } from "drizzle-orm";
import { Effect, Redacted } from "effect";
import * as crypto from "node:crypto";
import { Database, DatabaseLive } from "../../../db";
import { actors, sessions, type SessionInfo } from "../../../db/schema";
import {
  SessionAlreadyDeleted,
  SessionAlreadyExists,
  SessionNotCreated,
  SessionNotDeleted,
  SessionNotFound,
} from "./errors";
import { CreateSessionSchema, RemoveSessionSchema } from "./schemas";
import type { Prettify } from "../../../utils";

type SessionPrettified = Prettify<{ bearer_token: Redacted.Redacted<string> } & Omit<SessionInfo, "bearer_token">>;

export class SessionRepository extends Effect.Service<SessionRepository>()("@p0/core/session/repo", {
  effect: Effect.gen(function* (_) {
    const db = yield* _(Database);
    const create = (body: typeof CreateSessionSchema.Type) =>
      Effect.gen(function* (_) {
        const exists = yield* Effect.tryPromise(() =>
          db
            .select({ id: sessions.id })
            .from(sessions)
            .where(and(eq(sessions.actor_id, body.actor_id), isNull(sessions.deletedAt)))
            .execute()
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
        const session = _sessions[0];

        if (!session) return yield* Effect.fail(new SessionNotCreated());
        const redacted_session: SessionPrettified = Object.assign(session, {
          bearer_token: Redacted.make(session.bearer_token),
        });
        return yield* Effect.succeed(redacted_session);
      });

    const safe_delete = (id: typeof RemoveSessionSchema.Type) =>
      Effect.gen(function* (_) {
        const _sessions = yield* Effect.tryPromise(() =>
          db.select().from(sessions).where(eq(sessions.id, id)).limit(1).execute()
        );

        if (_sessions.length !== 1) return yield* Effect.fail(new SessionNotFound());

        const _session = _sessions[0];

        if (!_session) return yield* Effect.fail(new SessionNotFound());

        if (_session.deletedAt) return yield* Effect.fail(new SessionAlreadyDeleted());

        const removed_sessions = yield* Effect.tryPromise(() =>
          db.update(sessions).set({ deletedAt: new Date() }).where(eq(sessions.id, _session.id)).returning()
        );

        if (removed_sessions.length !== 1) return yield* Effect.fail(new SessionNotDeleted());

        const session = removed_sessions[0];
        if (!session) return yield* Effect.fail(new SessionNotFound());

        const redacted_session: SessionPrettified = Object.assign(session, {
          bearer_token: Redacted.make(session.bearer_token),
        });
        return yield* Effect.succeed(redacted_session);
      });

    const remove = (id: typeof RemoveSessionSchema.Type) =>
      Effect.gen(function* (_) {
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
        const session = removed_sessions[0];
        if (!session) return yield* Effect.fail(new SessionNotFound());
        const redacted_session: SessionPrettified = Object.assign(session, {
          bearer_token: Redacted.make(session.bearer_token),
        });
        return yield* Effect.succeed(redacted_session);
      });

    const all_non_deleted = Effect.gen(function* (_) {
      const _sessions = yield* Effect.tryPromise(() =>
        db.select().from(sessions).where(isNull(sessions.deletedAt)).execute()
      );
      return _sessions.map((s) => Object.assign(s, { bearer_token: Redacted.make(s.bearer_token) }));
    });

    const all = Effect.gen(function* (_) {
      const get_sessions = Effect.tryPromise(() => db.select().from(sessions).execute());

      const _sessions = yield* get_sessions;

      return _sessions.map((s) => {
        const redacted: SessionPrettified = Object.assign(s, { bearer_token: Redacted.make(s.bearer_token) });
        return redacted;
      });
    });

    const find_by_id = (id: string) =>
      Effect.gen(function* (_) {
        const get_session = Effect.tryPromise(() =>
          db.select().from(sessions).where(eq(sessions.id, id)).limit(1).execute()
        );
        const _sessions = yield* get_session;
        if (_sessions.length !== 1) return yield* Effect.fail(new SessionNotFound());

        const session = _sessions[0];
        if (!session) return yield* Effect.fail(new SessionNotFound());

        const redacted_session: SessionPrettified = Object.assign(session, {
          bearer_token: Redacted.make(session.bearer_token),
        });
        return yield* Effect.succeed(redacted_session);
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
      safe_delete,
    } as const;
  }),
  dependencies: [DatabaseLive],
}) {}
