import { A } from "@solidjs/router";
import { For, Switch } from "solid-js";

// import { IconCalendar, IconHome, IconMail, IconSearch, IconSettings } from "@/components/icons";
import Home from "lucide-solid/icons/home";
import Servers from "lucide-solid/icons/server";
import Settings from "lucide-solid/icons/settings";

import { useColorMode } from "@kobalte/core";
import Moon from "lucide-solid/icons/moon";
import Sun from "lucide-solid/icons/sun";
import { Match } from "solid-js";
import { DomainAsLogo } from "~/components/DomainAsLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "~/components/ui/sidebar";

const topItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Servers",
    url: "/servers",
    icon: Servers,
  },
];

const bottomItems = [
  {
    title: "Settings",
    url: "settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <A href="/" class="w-full flex flex-col items-center justify-center ">
          <DomainAsLogo />
        </A>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <For each={topItems}>
                {(item) => (
                  <SidebarMenuItem>
                    <SidebarMenuButton as={A} href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </For>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div class="flex flex-col grow"></div>
        <SidebarSeparator />
        <SidebarFooter>
          <SidebarMenu>
            <For each={bottomItems}>
              {(item) => (
                <SidebarMenuItem>
                  <SidebarMenuButton as={A} href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </For>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => toggleColorMode()}>
                <Switch>
                  <Match when={colorMode() === "light"}>
                    <Sun class="size-3.5" />
                    Bright
                  </Match>
                  <Match when={colorMode() === "dark"}>
                    <Moon class="size-3.5" />
                    Dark
                  </Match>
                </Switch>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
