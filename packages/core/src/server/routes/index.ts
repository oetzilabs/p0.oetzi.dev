import { HttpApi, HttpApiBuilder, HttpServerResponse, Path } from "@effect/platform";
import { NotFound } from "@effect/platform/HttpApiError";
import { Effect, Layer } from "effect";
import { AuthorizationLive } from "../middlewares/authorization";
import { ActorRepository } from "../models/actors/repository";
import { BrokerRepository } from "../models/brokers/repository";
import { ServerRepository } from "../models/servers/repository";
import { SessionRepository } from "../models/sessions/repository";
import { ActorsGroup } from "./actors";
import { BrokersGroup } from "./brokers";
import { PagesGroup } from "./pages";
import { ServersGroup } from "./servers";
import { BearerApiSecurity, SessionGroup } from "./sessions";
import { catchAll } from "@effect/platform/HttpRouter";

export const AllApis = HttpApi.make("AllApis")
  .add(PagesGroup)
  // add the groups
  .add(ServersGroup)
  .add(SessionGroup)
  .add(ActorsGroup)
  .add(BrokersGroup);

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
export const SessionApiLive = HttpApiBuilder.group(AllApis, "Session", (handlers) =>
  Effect.gen(function* (_) {
    yield* Effect.log("creating SessionApiLive");
    const session_repo = yield* _(SessionRepository);
    return handlers
      .handle("listAllSessions", () => session_repo.all)
      .handle("getSession", (params) => session_repo.find_by_id(params.path.session_id))
      .handle("deleteSession", (params) => session_repo.remove(params.path.session_id))
      .handle("createSession", (params) =>
        Effect.gen(function* (_) {
          const sc = yield* session_repo.create(params.payload);
          yield* HttpApiBuilder.securitySetCookie(BearerApiSecurity, sc.bearer_token);
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

export const BrokersApiLive = HttpApiBuilder.group(AllApis, "Brokers", (handlers) =>
  Effect.gen(function* (_) {
    yield* Effect.log("creating BrokersApiLive");
    const broker_repo = yield* _(BrokerRepository);
    return handlers
      .handle("listNonDeletedBrokers", () => broker_repo.all_non_deleted)
      .handle("listAllBrokers", () => broker_repo.all)
      .handle("getBroker", (params) => broker_repo.find_by_id(params.path.bid))
      .handle("deleteBroker", (params) => broker_repo.remove(params.path.bid))
      .handle("createBrokers", (params) => broker_repo.create(params.payload));
  })
).pipe(Layer.provide(BrokerRepository.Default), Layer.provide(AuthorizationLive));

export const PagesApiLive = HttpApiBuilder.group(AllApis, "Pages", (handlers) =>
  Effect.gen(function* (_) {
    const path = yield* _(Path.Path);
    yield* Effect.log("creating PagesApiLive");
    const current_dir = process.cwd();

    return handlers
      .handle("file", (params) =>
        Effect.gen(function* () {
          let file_path = path.join(current_dir, `packages/core/src/server/pages/${params.path["file"]}`);
          yield* Effect.log(`file path ${file_path}`);
          return yield* HttpServerResponse.file(file_path).pipe(
            Effect.catchTags({
              // PageNotFound: () => Effect.fail(new NotFound()),
              SystemError: () => Effect.fail(new NotFound()),
              BadArgument: () => Effect.fail(new NotFound()),
            })
          );
        })
      )
      .handleRaw("asset", (params) =>
        Effect.gen(function* () {
          let file_path = path.join(current_dir, `packages/core/src/server/pages/assets/${params.path["file"]}`);
          yield* Effect.log(`file path ${file_path}`);
          return yield* HttpServerResponse.file(file_path).pipe(
            Effect.catchTags({
              // PageNotFound: () => Effect.fail(new NotFound()),
              SystemError: () => Effect.fail(new NotFound()),
              BadArgument: () => Effect.fail(new NotFound()),
            })
          );
        })
      );
  })
);

export const AllApisLive = HttpApiBuilder.api(AllApis).pipe(
  Layer.provide(PagesApiLive),
  Layer.provide(ServerApiLive),
  Layer.provide(BrokersApiLive),
  Layer.provide(SessionApiLive),
  Layer.provide(ActorsApiLive)
);
