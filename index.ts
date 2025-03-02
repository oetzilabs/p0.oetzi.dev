import { Project } from "@p0/core/src/projects";
import { terminal_launcher } from "@p0/terminal";

const terminal = terminal_launcher({
  name: "asdf",
  projects: [
    Project.launch("examples/projects/wo65y7c2jgw6xfp5zf2mq46o"),
    Project.launch({
      name: "effect_ts_http_server",
      path: "packages/server/src",
      start_automatically: true,
      environment: {
        PORT: "8080",
      },
    }),
  ],
});
