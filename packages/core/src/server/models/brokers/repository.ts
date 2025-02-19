import { eq, isNull } from "drizzle-orm";
import { Context, Effect, Schema } from "effect";
import { Database, DatabaseLive } from "../../../db";
import { brokers } from "../../../db/schemas/brokers";
import { sessions } from "../../../db/schemas/sessions";
import {
  BrokerNotFound,
  BrokerAlreadyDeleted,
  BrokerNotDeleted,
  BrokerNotUpdated,
  BrokerNotCreated,
  BrokerAlreadyExists,
} from "./errors";
import type { CreateBrokerSchema, FindBrokerByNameSchema, RemoveBrokerSchema } from "./schemas";

// Define a schema for the "User"
export class Broker extends Schema.Class<Broker>("@p0/core/actor")({ id: Schema.String }) {}

// Define a Context.Tag for the authenticated user
export class CurrentBroker extends Context.Tag("@p0/core/actor/current")<CurrentBroker, Broker>() {}

export class BrokerRepository extends Effect.Service<BrokerRepository>()("@p0/core/actor/repo", {
  effect: Effect.gen(function* (_) {
    const db = yield* _(Database);

    const create = (body: typeof CreateBrokerSchema.Type) =>
      Effect.gen(function* (_) {
        const exists = yield* Effect.tryPromise(() =>
          db.select({ id: brokers.id }).from(brokers).where(eq(brokers.url, body.url)).execute()
        );

        if (exists.length !== 0) return yield* Effect.fail(new BrokerAlreadyExists());

        const create_actor = Effect.tryPromise(() => db.insert(brokers).values([body]).returning());

        const _brokers = yield* create_actor;

        if (_brokers.length !== 1) return yield* Effect.fail(new BrokerNotCreated());

        return yield* Effect.succeed(_brokers[0]);
      });

    const find_by_url = (url: typeof FindBrokerByNameSchema.Type) =>
      Effect.gen(function* (_) {
        const get_actor = Effect.tryPromise(() =>
          db.select().from(brokers).where(eq(brokers.url, url)).limit(1).execute()
        );
        const _brokers = yield* get_actor;
        if (_brokers.length !== 1) return yield* Effect.fail(new BrokerNotFound());
        return yield* Effect.succeed(_brokers[0]);
      });

    const find_by_bearer_token = (bearerToken: string) =>
      Effect.gen(function* (_) {
        const get_actor_session = Effect.tryPromise(() =>
          db
            .select()
            .from(sessions)
            .where(eq(sessions.bearer_token, bearerToken))
            .limit(1)
            .leftJoin(brokers, eq(sessions.actor_id, brokers.id))
        );
        const _actor_session = yield* get_actor_session;
        if (_actor_session.length !== 1) return yield* Effect.fail(new BrokerNotFound());

        const _actor = _actor_session[0].brokers;
        if (!_actor) return yield* Effect.fail(new BrokerNotFound());
        return yield* Effect.succeed(_actor);
      });

    const remove = (id: typeof RemoveBrokerSchema.Type) =>
      Effect.gen(function* (_) {
        // const repo = yield* _(BrokerRepository);

        const _brokers = yield* Effect.tryPromise(() =>
          db.select().from(brokers).where(eq(brokers.id, id)).limit(1).execute()
        );

        if (_brokers.length !== 1) return yield* Effect.fail(new BrokerNotFound());

        const _actor = _brokers[0];

        if (!_actor) return yield* Effect.fail(new BrokerNotFound());

        if (_actor.deletedAt) return yield* Effect.fail(new BrokerAlreadyDeleted());

        const removed_brokers = yield* Effect.tryPromise(() =>
          db.delete(brokers).where(eq(brokers.id, _actor.id)).returning()
        );

        if (removed_brokers.length !== 1) return yield* Effect.fail(new BrokerNotDeleted());

        return yield* Effect.succeed(removed_brokers[0]);
      });

    const all_non_deleted = Effect.gen(function* (_) {
      const _brokers = yield* Effect.tryPromise(() =>
        db.select().from(brokers).where(isNull(brokers.deletedAt)).execute()
      );
      return _brokers;
    });

    const all = Effect.gen(function* (_) {
      const get_brokers = Effect.tryPromise(() => db.select().from(brokers).execute());

      const _brokers = yield* get_brokers;

      return _brokers;
    });

    const find_by_id = (id: string) =>
      Effect.gen(function* (_) {
        const get_actor = Effect.tryPromise(() =>
          db.select().from(brokers).where(eq(brokers.id, id)).limit(1).execute()
        );
        const _brokers = yield* get_actor;
        if (_brokers.length !== 1) return yield* Effect.fail(new BrokerNotFound());
        return yield* Effect.succeed(_brokers[0]);
      });

    return {
      create,
      remove,
      all_non_deleted,
      all,
      find_by_id,
      find_by_bearer_token,
      find_by_url,
    } as const;
  }),
  dependencies: [DatabaseLive],
}) {}
