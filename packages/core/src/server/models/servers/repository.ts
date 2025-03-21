import { eq, isNull } from "drizzle-orm";
import { Effect } from "effect";
import { Database, DatabaseLive } from "../../../db";
import { servers } from "../../../db/schema";
import {
  ServerAlreadyDeleted,
  ServerAlreadyExists,
  ServerNotCreated,
  ServerNotDeleted,
  ServerNotFound,
} from "./errors";
import { CreateServerSchema, FindServerByNameSchema, RemoveServerSchema } from "./schemas";

export class ServerRepository extends Effect.Service<ServerRepository>()("@p0/core/server/repo", {
  effect: Effect.gen(function* (_) {
    const db = yield* _(Database);
    const create = (body: typeof CreateServerSchema.Type) =>
      Effect.gen(function* (_) {
        const exists = yield* Effect.tryPromise(() =>
          db.select({ id: servers.id }).from(servers).where(eq(servers.name, body.name)).execute()
        );

        if (exists.length !== 0) return yield* Effect.fail(new ServerAlreadyExists());

        const create_server = Effect.tryPromise(() => db.insert(servers).values([body]).returning());

        const _servers = yield* create_server;

        if (_servers.length !== 1) return yield* Effect.fail(new ServerNotCreated());
        const server = _servers[0];
        if (!server) return yield* Effect.fail(new ServerNotCreated());
        return yield* Effect.succeed(server);
      });

    const find_by_name = (name: typeof FindServerByNameSchema.Type) =>
      Effect.gen(function* (_) {
        const get_server = Effect.tryPromise(() =>
          db.select().from(servers).where(eq(servers.name, name)).limit(1).execute()
        );
        const _servers = yield* get_server;
        if (_servers.length !== 1) return yield* Effect.fail(new ServerNotFound());
        const server = _servers[0];
        if (!server) return yield* Effect.fail(new ServerNotFound());
        return yield* Effect.succeed(server);
      });
    const remove = (id: typeof RemoveServerSchema.Type) =>
      Effect.gen(function* (_) {
        const _servers = yield* Effect.tryPromise(() =>
          db.select().from(servers).where(eq(servers.id, id)).limit(1).execute()
        );

        if (_servers.length !== 1) return yield* Effect.fail(new ServerNotFound());

        const _server = _servers[0];

        if (!_server) return yield* Effect.fail(new ServerNotFound());

        if (_server.deletedAt) return yield* Effect.fail(new ServerAlreadyDeleted());

        const removed_servers = yield* Effect.tryPromise(() =>
          db.delete(servers).where(eq(servers.id, _server.id)).returning()
        );

        if (removed_servers.length !== 1) return yield* Effect.fail(new ServerNotDeleted());
        const server = removed_servers[0];
        if (!server) return yield* Effect.fail(new ServerNotDeleted());
        return yield* Effect.succeed(server);
      });

    const all_non_deleted = Effect.gen(function* (_) {
      const _servers = yield* Effect.tryPromise(() =>
        db.select().from(servers).where(isNull(servers.deletedAt)).execute()
      );
      return _servers;
    });

    const all = Effect.gen(function* (_) {
      const get_servers = Effect.tryPromise(() => db.select().from(servers).execute());

      const _servers = yield* get_servers;

      return _servers;
    });

    const find_by_id = (id: string) =>
      Effect.gen(function* (_) {
        const get_server = Effect.tryPromise(() =>
          db.select().from(servers).where(eq(servers.id, id)).limit(1).execute()
        );
        const _servers = yield* get_server;
        if (_servers.length !== 1) return yield* Effect.fail(new ServerNotFound());
        const server = _servers[0];
        if (!server) return yield* Effect.fail(new ServerNotFound());
        return yield* Effect.succeed(server);
      });

    return {
      create,
      remove,
      all_non_deleted,
      all,
      find_by_id,
      find_by_name,
    } as const;
  }),
  dependencies: [DatabaseLive],
}) {}
