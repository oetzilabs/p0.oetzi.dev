import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { FirecrackerLive, FirecrackerService } from "../firecracker";

describe("Firecracker", () => {
  it.sequential("create fc instance", () =>
    Effect.gen(function* (_) {
      const fc = yield* _(FirecrackerService);
      const result = yield* fc.run({
        zip: new File([], "test.zip"),
        environment: "ubuntu24",
        config: {
          persistent: false,
        },
      });
      assert.isNotNull(result);
      assert.strictEqual(result.success, true);
    }).pipe(Effect.provide(FirecrackerLive))
  );
});
