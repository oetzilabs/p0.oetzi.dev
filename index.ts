import { terminal_launcher } from "@p0/terminal";

const terminal = terminal_launcher({
  name: "asdf",
  projects: [
    {
      name: "http_server",
      path: "packages/server",
      command: "echo 'hello world'",
    },
    {
      name: "http_server2",
      path: "packages/server",
      command: "echo '222'",
    },
  ],
});
