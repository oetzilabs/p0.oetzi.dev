import { terminal_launcher } from "@p0/terminal";

const terminal = terminal_launcher({
  name: "asdf",
  projects: [
    {
      name: "http_server",
      path: "packages/server/src",
      start_automatically: true,
    },
  ],
});
