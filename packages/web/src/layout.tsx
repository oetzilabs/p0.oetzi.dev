import { ParentProps } from "solid-js";
import { SidebarTrigger, useSidebar } from "./components/ui/sidebar";
import { Header } from "./components/Header";
import { cn } from "./lib/utils";

export const AppLayout = (props: ParentProps) => {
  const { open: sidebarOpen } = useSidebar();
  return (
    <div
      class={cn("w-full flex flex-col h-screen overflow-clip p-2 gap-2 transition-[padding] duration-300", {
        "pl-0": sidebarOpen(),
      })}
      style={{
        "scrollbar-gutter": "stable both-edges",
      }}
    >
      <main class="w-full h-full flex flex-col grow border rounded-md shadow relative">
        <div class="p-2 border-b flex flex-row items-center justify-between">
          <div class="flex flex-row items-center gap-2 z-50">
            <SidebarTrigger />
            <Header />
          </div>
        </div>
        <div class="p-2 grow h-full w-full flex flex-col">{props.children}</div>
      </main>
    </div>
  );
};
