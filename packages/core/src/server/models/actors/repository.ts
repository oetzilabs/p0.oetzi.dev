import { eq, isNull } from "drizzle-orm";
import { Context, Effect, Schema } from "effect";
import { Database, DatabaseLive } from "../../../db";
import { actors } from "../../../db/schemas/actors";
import { sessions } from "../../../db/schemas/sessions";
import { ActorAlreadyDeleted, ActorAlreadyExists, ActorNotCreated, ActorNotDeleted, ActorNotFound } from "./errors";
import type { CreateActorSchema, FindActorByNameSchema, RemoveActorSchema } from "./schemas";

export class Actor extends Schema.Class<Actor>("@p0/core/actor")({ id: Schema.String }) {}

export class CurrentActor extends Context.Tag("@p0/core/actor/current")<CurrentActor, Actor>() {}

export class ActorRepository extends Effect.Service<ActorRepository>()("@p0/core/actor/repo", {
  effect: Effect.gen(function* (_) {
    const db = yield* _(Database);

    const create = (body: typeof CreateActorSchema.Type) =>
      Effect.gen(function* (_) {
        const exists = yield* Effect.tryPromise(() =>
          db.select({ id: actors.id }).from(actors).where(eq(actors.name, body.name)).execute()
        );

        if (exists.length !== 0) return yield* Effect.fail(new ActorAlreadyExists());

        const create_actor = Effect.tryPromise(() => db.insert(actors).values([body]).returning());

        const _actors = yield* create_actor;

        if (_actors.length !== 1) return yield* Effect.fail(new ActorNotCreated());

        const actor = _actors[0];
        if (!actor) return yield* Effect.fail(new ActorNotCreated());

        return yield* Effect.succeed(actor);
      });

    const find_by_name = (name: typeof FindActorByNameSchema.Type) =>
      Effect.gen(function* (_) {
        const get_actor = Effect.tryPromise(() =>
          db.select().from(actors).where(eq(actors.name, name)).limit(1).execute()
        );
        const _actors = yield* get_actor;
        if (_actors.length !== 1) return yield* Effect.fail(new ActorNotFound());
        return yield* Effect.succeed(_actors[0]);
      });

    const find_by_bearer_token = (bearerToken: string) =>
      Effect.gen(function* (_) {
        const get_actor_session = Effect.tryPromise(() =>
          db
            .select()
            .from(sessions)
            .where(eq(sessions.bearer_token, bearerToken))
            .limit(1)
            .leftJoin(actors, eq(sessions.actor_id, actors.id))
        );
        const _actor_session = yield* get_actor_session;
        if (_actor_session.length !== 1) return yield* Effect.fail(new ActorNotFound());
        const session = _actor_session[0];
        if (!session) return yield* Effect.fail(ActorNotFound);
        const _actor = session.actors;
        if (!_actor) return yield* Effect.fail(ActorNotFound);
        return yield* Effect.succeed(_actor);
      });

    const remove = (id: typeof RemoveActorSchema.Type) =>
      Effect.gen(function* (_) {
        const _actors = yield* Effect.tryPromise(() =>
          db.select().from(actors).where(eq(actors.id, id)).limit(1).execute()
        );

        if (_actors.length !== 1) return yield* Effect.fail(new ActorNotFound());

        const _actor = _actors[0];

        if (!_actor) return yield* Effect.fail(new ActorNotFound());

        if (_actor.deletedAt) return yield* Effect.fail(new ActorAlreadyDeleted());

        const removed_actors = yield* Effect.tryPromise(() =>
          db.delete(actors).where(eq(actors.id, _actor.id)).returning()
        );

        if (removed_actors.length !== 1) return yield* Effect.fail(new ActorNotDeleted());
        const actor = removed_actors[0];
        if (!actor) return yield* Effect.fail(new ActorNotFound());
        return yield* Effect.succeed(actor);
      });

    const all_non_deleted = Effect.gen(function* (_) {
      const _actors = yield* Effect.tryPromise(() =>
        db.select().from(actors).where(isNull(actors.deletedAt)).execute()
      );
      return _actors;
    });

    const all = Effect.gen(function* (_) {
      const get_actors = Effect.tryPromise(() => db.select().from(actors).execute());

      const _actors = yield* get_actors;

      return _actors;
    });

    const find_by_id = (id: string) =>
      Effect.gen(function* (_) {
        const get_actor = Effect.tryPromise(() => db.select().from(actors).where(eq(actors.id, id)).limit(1).execute());
        const _actors = yield* get_actor;
        if (_actors.length !== 1) return yield* Effect.fail(new ActorNotFound());
        const actor = _actors[0];
        if (!actor) return yield* Effect.fail(new ActorNotFound());
        return yield* Effect.succeed(actor);
      });

    return {
      create,
      remove,
      all_non_deleted,
      all,
      find_by_id,
      find_by_bearer_token,
      find_by_name,
    } as const;
  }),
  dependencies: [DatabaseLive],
}) {}
