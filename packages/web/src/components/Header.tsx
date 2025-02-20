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
      <div class="items-center justify-between flex flex-row border border-neutral-100 dark:border-neutral-800 p-2">
        <A href="/" class="font-bold font-[Inter]">
          Dashboard - P0
        </A>
        <div class=""></div>
        <div class="">
          <Button onClick={() => toggleColorMode()} size="icon">
            <Switch>
              <Match when={colorMode() === "light"}>
                <Sun class="size-4" />
              </Match>
              <Match when={colorMode() === "dark"}>
                <Moon class="size-4" />
              </Match>
            </Switch>
          </Button>
        </div>
      </div>
    </header>
  );
};
