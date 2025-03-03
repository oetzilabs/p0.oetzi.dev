import { Effect, pipe, Stream } from "effect";
import type { Compute } from "./schemas";
import { Command, FileSystem, Path } from "@effect/platform";
import { BaseLoggerService } from "../logger";
import { ComputeNotAvailable, ComputeOverloaded, ComputeShutdown } from "./errors";
import { env } from "bun";
import { BunFileSystem } from "@effect/platform-bun";

export class ComputeUnit extends Effect.Service<ComputeUnit>()("@p0/core/git/repo", {
  effect: Effect.gen(function* (_) {
    const log = yield* _(BaseLoggerService);
    const logger = log.withGroup("git");
    const cwd = process.cwd();
    const path = yield* _(Path.Path);
    const fs = yield* _(FileSystem.FileSystem);


    return {
    } as const;
  }),
  dependencies: [BunFileSystem.layer],
}) {}

export const ComputeUnitLive = ComputeUnit.Default;

