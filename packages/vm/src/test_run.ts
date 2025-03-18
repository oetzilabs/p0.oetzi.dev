import { BunContext, BunFileSystem, BunRuntime } from "@effect/platform-bun";
import { FirecrackerService, FirecrackerLive } from ".";
import { Effect } from "effect";

const program = Effect.gen(function* (_) {
  const fcService = yield* _(FirecrackerService);
  return yield* fcService.prepare();
}).pipe(Effect.provide(FirecrackerLive), Effect.provide(BunContext.layer), Effect.provide(BunFileSystem.layer));

BunRuntime.runMain(Effect.scoped(program));
