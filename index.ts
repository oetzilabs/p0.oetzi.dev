import { terminal_launcher } from "@p0/terminal";

const terminal = terminal_launcher({
  name: "asdf",
  projects: [
    {
      name: "solid_dashboard",
      path: "packages/web",
      start_automatically: true,
      command: "bun dev",
    },
    {
      name: "effect_ts_http_server",
      path: "packages/server/src",
      start_automatically: true,
    },
  ],
});
