import {
  FetchHttpClient,
  HttpApiBuilder,
  HttpApiClient,
  HttpApiSwagger,
  HttpMiddleware,
  HttpServer,
} from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { ServerRepository } from "@p0/core/src/entities/server/repository";
import { ServerLive, ServersApi } from "@p0/core/src/routes/servers";
import { Effect, Layer } from "effect";

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(
    HttpApiSwagger.layer({
      path: "/docs",
    })
  ),
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(ServerLive),
  Layer.provide(ServerRepository.Default),
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layer({ port: 3000 }))
);

Layer.launch(HttpLive).pipe(BunRuntime.runMain);

// Create a program that derives and uses the client
const program = Effect.gen(function* () {
  const client = yield* HttpApiClient.make(ServersApi, {
    baseUrl: "http://localhost:3000",
  });
  const all_servers = yield* client.Servers.listAllServers();
  console.log(all_servers);
});

// Provide a Fetch-based HTTP client and run the program
Effect.runFork(program.pipe(Effect.provide(FetchHttpClient.layer)));
