import { ServerRepository } from "@p0/core/src/server/models/servers/repository";
import { type CreateServer } from "@p0/core/src/server/models/servers/schemas";
import { action, query } from "@solidjs/router";
import { Effect } from "effect";

export const list = query(async () => {
  "use server";

  const program = Effect.gen(function* (_) {
    const server_repo = yield* _(ServerRepository);
    const servers = yield* server_repo.all;
    return servers;
  }).pipe(Effect.provide(ServerRepository.Default));

  const servers = await Effect.runPromise(program);

  return servers;
}, "server-list");

export const create = action(async (data: CreateServer) => {
  "use server";
  const server = await Effect.runPromise(
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);
      const server = yield* server_repo.create(data);
      return server;
    }).pipe(Effect.provide(ServerRepository.Default))
  );

  return server;
});

export const findById = query(async (id: string) => {
  "use server";
  const server = await Effect.runPromise(
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);
      const server = yield* server_repo.find_by_id(id);
      return server;
    }).pipe(Effect.provide(ServerRepository.Default))
  );

  return server;
}, "server-find-by-id");

export const findByName = query(async (name: string) => {
  "use server";
  const server = await Effect.runPromise(
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);
      const server = yield* server_repo.find_by_name(name);
      return server;
    }).pipe(Effect.provide(ServerRepository.Default))
  );

  return server;
}, "server-find-by-name");
