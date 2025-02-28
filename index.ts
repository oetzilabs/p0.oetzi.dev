import { Project } from "@p0/core/src/projects";
import { terminal_launcher } from "@p0/terminal";
import { effect } from "solid-js/web";

const terminal = terminal_launcher({
  name: "asdf",
  projects: [
    Project.make({
      name: "solid_dashboard",
      path: "packages/web",
      start_automatically: true,
      command: "bun dev",
    }),
    Project.make({
      name: "effect_ts_http_server",
      path: "packages/server/src",
      start_automatically: true,
    }),
  ],
});
