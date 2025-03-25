// create a header with the name `Dashboard` on the left and on the right a button to switch the brightness of the app

import { A } from "@solidjs/router";
import { Button } from "./ui/button";
import { useColorMode } from "@kobalte/core";
import { Match, Switch } from "solid-js";
import Moon from "lucide-solid/icons/moon";
import Sun from "lucide-solid/icons/sun";

export const Header = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <header class="w-full p-2 flex flex-col">
      <div class="items-center justify-between flex flex-row border border-neutral-300 dark:border-neutral-700 p-2 rounded-md">
        <A href="/" class="font-bold font-[Inter]">
          Dashboard - P0
        </A>
        <div class=""></div>
        <div class="">
          <Button onClick={() => toggleColorMode()} class="h-6 px-2">
            <Switch>
              <Match when={colorMode() === "light"}>
                Bright
                <Sun class="size-3.5" />
              </Match>
              <Match when={colorMode() === "dark"}>
                Dark
                <Moon class="size-3.5" />
              </Match>
            </Switch>
          </Button>
        </div>
      </div>
    </header>
  );
};
