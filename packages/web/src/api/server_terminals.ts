import { ServerRepository } from "@p0/core/src/server/models/servers/repository";
import { ServerTerminalRepository } from "@p0/core/src/server/models/server_terminals/repository";
import { action, json } from "@solidjs/router";
import { Effect, Option } from "effect";
import { findById } from "./servers";

export const configureTerminalAccess = action(async (server_id: string) => {
  "use server";
  const terminal = await Effect.runPromise(
    Effect.gen(function* (_) {
      const server_repo = yield* _(ServerRepository);

      const server = yield* server_repo.find_by_id(server_id);
      if (!server) return Option.none();
      if (server.status !== "available") {
        return yield* Effect.fail(new Error("The Server is not available"));
      }
      if (server.websocket_url === null) {
        // TODO: Websocket should be configured here.
        return yield* Effect.fail(new Error("The Server has no websocket configuration"));
      }

      const server_terminal_repo = yield* _(ServerTerminalRepository);
      const terminal = yield* server_terminal_repo.create({ server_id: server.id });
      if (!terminal) return Option.none();

      return Option.some(terminal);
    }).pipe(Effect.provide(ServerRepository.Default), Effect.provide(ServerTerminalRepository.Default))
  );

  if (Option.isNone(terminal)) throw new Error("Something went wrong");

  return json(terminal.value, {
    revalidate: [findById.keyFor(server_id)],
  });
});
