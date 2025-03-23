import { BunContext, BunFileSystem, BunRuntime } from "@effect/platform-bun";
import { Duration, Effect } from "effect";
import { runner } from ".";
import { FirecrackerLive } from "./firecracker";

const program = Effect.gen(function* (_) {
  const x = yield* runner({
    zip: new File([], "test.zip"),
    environment: "nodejs22",
    config: {
      timeout: Duration.seconds(10),
      persistent: false,
      modules: {
        network: true,
      },
    },
  });
  return x;
}).pipe(Effect.provide(FirecrackerLive), Effect.provide(BunContext.layer), Effect.provide(BunFileSystem.layer));

BunRuntime.runMain(Effect.scoped(program));
