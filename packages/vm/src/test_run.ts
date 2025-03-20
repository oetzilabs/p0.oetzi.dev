import { BunContext, BunFileSystem, BunRuntime } from "@effect/platform-bun";
import { FirecrackerService, FirecrackerLive } from ".";
import { Effect } from "effect";

const program = Effect.gen(function* (_) {
  const firecracker = yield* _(FirecrackerService);
  yield* firecracker.run({
    code: "console.log('hello world')",
    language: "js",
    config: {
      // os: "ubuntu-24.04.ext4",
      timeout: 10,
      persistent: false,
      drives: [],
      network_interfaces: [],
    },
  });
  return;
}).pipe(Effect.provide(FirecrackerLive), Effect.provide(BunContext.layer), Effect.provide(BunFileSystem.layer));

BunRuntime.runMain(Effect.scoped(program));
