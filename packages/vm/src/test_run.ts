import { BunContext, BunFileSystem, BunRuntime } from "@effect/platform-bun";
import { FirecrackerService, FirecrackerLive } from "./firecracker";
import { Duration, Effect } from "effect";

const program = Effect.gen(function* (_) {
  const firecracker = yield* _(FirecrackerService);
  const vmExectutionResult = yield* firecracker.run({
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

  return vmExectutionResult;
}).pipe(Effect.provide(FirecrackerLive), Effect.provide(BunContext.layer), Effect.provide(BunFileSystem.layer));

BunRuntime.runMain(Effect.scoped(program));
