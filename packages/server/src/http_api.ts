import { DevTools } from "@effect/experimental";
import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware, HttpServer } from "@effect/platform";
import { BunHttpServer, BunRuntime, BunSocket } from "@effect/platform-bun";
import { ServerRepository } from "@p0/core/src/entities/server/repository";
import { ServerLive } from "@p0/core/src/routes/servers";
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
const DevToolsLive = DevTools.layerWebSocket().pipe(Layer.provide(BunSocket.layerWebSocketConstructor));

export const http_api_launcher = () => Layer.launch(HttpLive).pipe(Effect.provide(DevToolsLive), BunRuntime.runMain);
