import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware, HttpServer } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { ServerRepository } from "@p0/core/src/entities/server/repository";
import { ServerLive } from "@p0/core/src/routes/servers";
import { Layer } from "effect";

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

export const http_api_launcher = () => Layer.launch(HttpLive).pipe(BunRuntime.runMain);
