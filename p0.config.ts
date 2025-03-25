import { Project } from "@p0/core/src/projects";
import $launcher from "@p0/terminal";

export default $launcher({
  name: "asdf",
  run: (config, launch) => [
    launch({
      name: "web_server",
      path: "packages/web",
      start_automatically: true,
      dev: true,
      environment: {
        PORT: "23000",
      },
      command: "bun run dev",
    }),
    launch({
      name: "main_server",
      path: "packages/server/src",
      start_automatically: true,
      environment: {
        PORT: "8080",
      },
    }),
  ],
});
