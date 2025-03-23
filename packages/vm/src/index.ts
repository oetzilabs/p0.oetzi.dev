import { Effect } from "effect";

import * as Firecracker from "./firecracker";
import type { Run } from "./firecracker/schema";

/*
example:
{
      zip: new File([], "test.zip"),
      environment: "nodejs22",
      config: {
        timeout: Duration.seconds(10),
        persistent: false,
        modules: {
          network: true,
        },
      },
    }
*/
export const runner = (run: Run) =>
  Effect.gen(function* (_) {
    const firecracker = yield* _(Firecracker.FirecrackerService);
    return yield* firecracker.run(run);
  });
