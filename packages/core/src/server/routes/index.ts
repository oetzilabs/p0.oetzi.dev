import { HttpApi, HttpApiBuilder } from "@effect/platform";
import { Effect, Layer, pipe, Redacted } from "effect";
import { AuthorizationLive } from "../middlewares/authorization";
import { ServerRepository } from "../models/servers/repository";
import { SessionRepository } from "../models/sessions/repository";
import { AuthGroup, BearerApiSecurity } from "./auth";
import { ServersGroup } from "./servers";
import { ActorRepository } from "../models/actors/repository";
import { ActorsGroup } from "./actors";

export const AllApis = HttpApi.make("AllApis")
  // add the groups
  .add(ServersGroup)
  .add(AuthGroup)
  .add(ActorsGroup);

// implement the `Servers` group
export const ServerApiLive = HttpApiBuilder.group(AllApis, "Servers", (handlers) =>
  Effect.gen(function* (_) {
    yield* Effect.log("creating ServerApiLive");
    const server_repo = yield* _(ServerRepository);
    return handlers
      .handle("listNonDeletedServers", () => server_repo.all_non_deleted)
      .handle("listAllServers", () => server_repo.all)
      .handle("getServer", (params) => server_repo.find_by_id(params.path.sid))
      .handle("deleteServer", (params) => server_repo.remove(params.path.sid))
      .handle("createServers", (params) => server_repo.create(params.payload));
  })
).pipe(Layer.provide(ServerRepository.Default), Layer.provide(AuthorizationLive));

// implement the `Auth` group
export const AuthApiLive = HttpApiBuilder.group(AllApis, "Auth", (handlers) =>
  Effect.gen(function* (_) {
    yield* Effect.log("creating AuthApiLive");
    const session_repo = yield* _(SessionRepository);
    return handlers
      .handle("listAllSessions", () => session_repo.all)
      .handle("getSession", (params) => session_repo.find_by_id(params.path.session_id))
      .handle("deleteSession", (params) => session_repo.remove(params.path.session_id))
      .handle("createSession", (params) =>
        Effect.gen(function* (_) {
          const sc = yield* session_repo.create(params.payload);
          yield* HttpApiBuilder.securitySetCookie(BearerApiSecurity, Redacted.make(sc.bearer_token));
          return sc;
        })
      );
  })
).pipe(Layer.provide(SessionRepository.Default), Layer.provide(AuthorizationLive));

// implement the `Actors` group
export const ActorsApiLive = HttpApiBuilder.group(AllApis, "Actors", (handlers) =>
  Effect.gen(function* (_) {
    yield* Effect.log("creating ActorsApiLive");
    const actor_repo = yield* _(ActorRepository);
    return handlers
      .handle("listNonDeletedActors", () => actor_repo.all_non_deleted)
      .handle("listAllActors", () => actor_repo.all)
      .handle("getActor", (params) => actor_repo.find_by_id(params.path.sid))
      .handle("deleteActor", (params) => actor_repo.remove(params.path.sid))
      .handle("createActor", (params) => actor_repo.create(params.payload));
  })
).pipe(Layer.provide(ActorRepository.Default), Layer.provide(AuthorizationLive));

export const AllApisLive = HttpApiBuilder.api(AllApis).pipe(
  Layer.provide(ServerApiLive),
  Layer.provide(AuthApiLive),
  Layer.provide(ActorsApiLive)
);
