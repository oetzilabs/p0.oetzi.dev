import { For, Switch } from "solid-js";
import { A } from "@solidjs/router";

// import { IconCalendar, IconHome, IconMail, IconSearch, IconSettings } from "@/components/icons";
import Servers from "lucide-solid/icons/server";
import Home from "lucide-solid/icons/home";
import Mail from "lucide-solid/icons/mail";
import Search from "lucide-solid/icons/search";
import Settings from "lucide-solid/icons/settings";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { useColorMode } from "@kobalte/core";
import { Match } from "solid-js";
import Sun from "lucide-solid/icons/sun";
import Moon from "lucide-solid/icons/moon";

const items = [
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
  {
    title: "Search",
    url: "search",
    icon: Search,
  },
  {
    title: "Settings",
    url: "settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <For each={items}>
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
        <SidebarFooter>
          <SidebarMenu>
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
