import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware, HttpServer } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { DevToolsLive } from "@p0/core/src/devtools";
import { AllApisLive } from "@p0/core/src/server/routes";
import { Effect, Layer } from "effect";

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(
    HttpApiSwagger.layer({
      path: "/docs",
    })
  ),
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(AllApisLive),
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layer({ port: 3000 }))
);

export const http_api_launcher = () => Layer.launch(HttpLive).pipe(Effect.provide(DevToolsLive), BunRuntime.runMain);
