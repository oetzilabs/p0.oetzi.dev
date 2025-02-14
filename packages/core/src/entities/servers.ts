import { servers, type ServerInfo as ServerInfo } from "@p0/core/src/db/schemas/servers";
import { eq, isNull } from "drizzle-orm";
import { Effect, Either, Option, Schema } from "effect";
import { Database } from "../db";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform";

export module Servers {
  export const CreateServerSchema = Schema.Struct({
    name: Schema.String,
    url: Schema.String,
  });

  export const RemoveServerSchema = Schema.String;

  export class ServerCreationFailed extends Error {
    readonly _tag = "ServerCreationFailed";
    constructor(message?: string) {
      super(message || "Failed to create server");
      this.name = "ServerCreationFailed";
    }
  }

  export class ServerNotFound extends Schema.TaggedError<ServerNotFound>()("ServerNotFound", {}) {}
  export class ServerAlreadyExists extends Schema.TaggedError<ServerAlreadyExists>()("ServerAlreadyExists", {}) {}
  export class ServerDeleted extends Schema.TaggedError<ServerDeleted>()("ServerDeleted", {}) {}
  export class ServerNotDeleted extends Schema.TaggedError<ServerNotDeleted>()("ServerNotDeleted", {}) {}
  export class ServerNotUpdated extends Schema.TaggedError<ServerNotUpdated>()("ServerNotUpdated", {}) {}
  export class ServerNotCreated extends Schema.TaggedError<ServerNotCreated>()("ServerNotCreated", {}) {}
  export class ServerAlreadyDeleted extends Schema.TaggedError<ServerAlreadyDeleted>()("ServerAlreadyDeleted", {}) {}

  export type Info = ServerInfo;

  export const ServerSchema = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    url: Schema.String,
    createdAt: Schema.DateFromSelf.annotations({ jsonSchema: Date }),
    updatedAt: Schema.NullOr(Schema.DateFromSelf.annotations({ jsonSchema: Date })),
    deletedAt: Schema.NullOr(Schema.DateFromSelf.annotations({ jsonSchema: Date })),
  });

  export const NullableServerSchema = Schema.NullOr(ServerSchema);

  export const ListServersSchema = Schema.Array(Servers.ServerSchema);

  export const create = (body: typeof CreateServerSchema.Type) =>
    Effect.gen(function* (_) {
      const db = yield* _(Database);

      const create_server = Effect.tryPromise(() => db.insert(servers).values([body]).returning());

      const _servers = yield* create_server;

      if (_servers.length !== 1) return yield* Effect.fail(new Servers.ServerNotCreated());
      return yield* Effect.succeed(_servers[0]);
    });

  export const remove = (id: typeof RemoveServerSchema.Type) =>
    Effect.gen(function* (_) {
      const db = yield* _(Database);

      const _server = yield* find_by_id(id).pipe(Effect.either);
      if (Either.isLeft(_server)) return yield* Effect.fail(_server.left);

      if (_server.right.deletedAt) return yield* Effect.fail(new Servers.ServerAlreadyDeleted());
      const remove_server = Effect.tryPromise(() =>
        db.delete(servers).where(eq(servers.id, _server.right.id)).returning()
      );

      const _servers = yield* remove_server;
      if (_servers.length !== 1) return yield* Effect.fail(new Servers.ServerNotDeleted());
      return yield* Effect.succeed(_servers[0]);
    });

  export const all_non_deleted = Effect.gen(function* (_) {
    const db = yield* _(Database);
    const _servers = yield* Effect.tryPromise(() =>
      db.select().from(servers).where(isNull(servers.deletedAt)).execute()
    );
    return _servers;
  });

  export const all = Effect.gen(function* (_) {
    const db = yield* _(Database);

    const get_servers = Effect.tryPromise(() => db.select().from(servers).execute());

    const _servers = yield* get_servers;

    return _servers;
  });

  export const find_by_id = (id: string) =>
    Effect.gen(function* (_) {
      const db = yield* _(Database);

      const get_server = Effect.tryPromise(() =>
        db.select().from(servers).where(eq(servers.id, id)).limit(1).execute()
      );
      const _servers = yield* get_server;
      if (_servers.length !== 1) return yield* Effect.fail(new Servers.ServerNotFound());
      return yield* Effect.succeed(_servers[0]);
    });

  export const GetServerByIdParamSchema = Schema.Struct({
    sid: Schema.String,
  });

  // export const router = HttpRouter.empty.pipe(
  //   HttpRouter.get(
  //     "/servers",
  //     // Map the the Result of the getServers function to a Response as json
  //     Effect.gen(function* (_) {
  //       const servers = yield* Servers.all_non_deleted;
  //       const json = yield* HttpServerResponse.json(servers);
  //       return json;
  //     })
  //   ),
  //   HttpRouter.post(
  //     "/servers",
  //     Effect.gen(function* (_) {
  //       const request = yield* _(HttpServerRequest.HttpServerRequest);
  //       const body = yield* _(request.json);

  //       const data = yield* Schema.decodeUnknown(Servers.CreateServerSchema)(body);

  //       // if (!data) return yield* HttpServerResponse.text("Wrong Payload", { status: 500 });

  //       const result = yield* Servers.create(data);

  //       if (Option.isNone(result)) return yield* HttpServerResponse.text("Server not found", { status: 404 });

  //       const json = yield* HttpServerResponse.json(result.value);
  //       return json;
  //     })
  //   ),
  //   HttpRouter.del(
  //     "/servers/:sid",
  //     HttpRouter.schemaPathParams(GetServerByIdParamSchema).pipe(
  //       Effect.flatMap((params) =>
  //         Effect.gen(function* (_) {
  //           const server = yield* Servers.find_by_id(params.sid);
  //           if (Option.isNone(server)) return yield* HttpServerResponse.text("Server not found", { status: 404 });
  //           const result = yield* Servers.remove(server.value.id);
  //           if (Option.isNone(result))
  //             return yield* HttpServerResponse.text("Server could not be deleted", { status: 500 });
  //           const json = yield* HttpServerResponse.json(result.value);
  //           return json;
  //         })
  //       )
  //     )
  //   ),
  //   HttpRouter.get(
  //     "/servers/:sid",
  //     HttpRouter.schemaPathParams(GetServerByIdParamSchema).pipe(
  //       Effect.flatMap((params) =>
  //         Effect.gen(function* (_) {
  //           const server = yield* Servers.find_by_id(params.sid);
  //           if (Option.isNone(server)) return yield* HttpServerResponse.text("Server not found", { status: 404 });
  //           const json = yield* HttpServerResponse.json(server.value);
  //           return json;
  //         })
  //       )
  //     )
  //   )
  // );
}
