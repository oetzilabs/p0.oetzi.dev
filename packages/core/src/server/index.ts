import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware, HttpServer } from "@effect/platform";
import { BunHttpServer } from "@effect/platform-bun";
import { AllApisLive } from "@p0/core/src/server/routes";
import { Layer } from "effect";

export const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(
    HttpApiSwagger.layer({
      path: "/docs",
    })
  ),
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(AllApisLive),
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layer({}))
);
