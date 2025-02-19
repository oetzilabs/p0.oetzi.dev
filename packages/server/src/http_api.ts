import { BunRuntime } from "@effect/platform-bun";
import { DevToolsLive } from "@p0/core/src/devtools";
import { HttpLive } from "@p0/core/src/server";
import { Effect, Layer } from "effect";

export const http_api_launcher = () => Layer.launch(HttpLive).pipe(Effect.provide(DevToolsLive), BunRuntime.runMain);
