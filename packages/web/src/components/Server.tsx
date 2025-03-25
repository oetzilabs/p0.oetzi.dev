import { type Server as ServerType } from "@p0/core/src/server/models/servers/schemas";
import ServerLogo from "lucide-solid/icons/server";
import ServerOffLogo from "lucide-solid/icons/server-off";
import StoppedLogo from "lucide-solid/icons/stop-circle";
import Loading2 from "lucide-solid/icons/loader-2";
import QuestionMark from "lucide-solid/icons/circle-help";
import SettingsIcon from "lucide-solid/icons/settings";
import { Match, Show, Switch } from "solid-js";
import { A } from "@solidjs/router";
import { Button } from "./ui/button";

export const Server = (props: { server: ServerType }) => {
  return (
    <div class="flex flex-col p-2 border border-neutral-300 dark:border-neutral-700 w-full gap-2 rounded-sm">
      <div class="flex flex-row items-center justify-between gap-2">
        <div class="font-bold">{props.server.name}</div>
        <div class="flex flex-row items-center gap-2">
          <Switch fallback={<QuestionMark class="size-4 dark:text-yellow-300 text-yellow-400" />}>
            <Match when={props.server.status === "available"}>
              <ServerLogo class="size-4 dark:text-teal-300 text-teal-400" />
            </Match>
            <Match when={props.server.status === "unavailable"}>
              <ServerOffLogo class="size-4 dark:text-rose-300 text-rose-400" />
            </Match>
            <Match when={props.server.status === "stopped"}>
              <StoppedLogo class="size-4 dark:text-rose-300 text-rose-400" />
            </Match>
            <Match when={props.server.status === "starting"}>
              <Loading2 class="size-4 animate-spin dark:text-neutral-300 text-neutral-400" />
            </Match>
            <Match when={props.server.status === "stopping"}>
              <Loading2 class="size-4 animate-spin dark:text-yellow-300 text-yellow-400" />
            </Match>
            <Match when={props.server.status === "backing_up"}>
              <Loading2 class="size-4 animate-spin dark:text-neutral-300 text-neutral-400" />
            </Match>
            <Match when={props.server.status === "restoring"}>
              <Loading2 class="size-4 animate-spin dark:text-sky-300 text-sky-400" />
            </Match>
          </Switch>
          <Button variant="secondary" size="icon" class="size-6" as={A} href={`/servers/${props.server.id}/settings`}>
            <SettingsIcon class="size-3.5" />
          </Button>
        </div>
      </div>
      <A target="_blank" href={props.server.url} class="italic text-sm w-max hover:underline">
        {props.server.url}
      </A>
    </div>
  );
};
