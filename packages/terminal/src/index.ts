import { BunContext, BunRuntime } from "@effect/platform-bun";
import { TerminalProgram } from "@p0/core/src/terminal";
import { Effect } from "effect";

export const terminal_launcher = (...args: Parameters<typeof TerminalProgram>) =>
  BunRuntime.runMain(Effect.scoped(TerminalProgram(...args)).pipe(Effect.provide(BunContext.layer)));
