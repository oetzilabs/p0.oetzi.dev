import { Project } from "@p0/core/src/projects";
import $launcher from "@p0/terminal";

export default $launcher({
  name: "asdf",
  run: (config, launch) => [
    // Project.launch("examples/projects/wo65y7c2jgw6xfp5zf2mq46o"),
    launch({
      name: "main_server",
      path: "packages/server/src",
      start_automatically: true,
      environment: {
        PORT: "8080",
      },
    }),
    launch({
      name: "main_server_2",
      path: "packages/server/src",
      start_automatically: true,
      environment: {
        PORT: "8081",
      },
    }),
  ],
});
