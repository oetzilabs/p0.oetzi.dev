import { BunRuntime } from "@effect/platform-bun";
import { create } from "@p0/core/src/compute";
import { cuid2 } from "@p0/core/src/cuid2";
import { Stream } from "effect";
import { worker_program } from "..";

const worker_stream = Stream.make(
  create({
    type: "task",
    id: cuid2(),
    config: {
      payload: {},
      script: `
  async function main(pl, mods) {
    console.log("loaded");
    return "loaded";
  }`,
    },
  })
);

BunRuntime.runMain(worker_program(worker_stream));
