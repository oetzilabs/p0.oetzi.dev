import { list } from "@/api/servers";
import AddServerForm from "@/components/forms/server/add";
import { Server } from "@/components/Server";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createAsync, revalidate, RouteDefinition, useSearchParams } from "@solidjs/router";
import MenuIcon from "lucide-solid/icons/menu";
import PlusIcon from "lucide-solid/icons/plus";
import RefreshIcon from "lucide-solid/icons/refresh-ccw";
import { For, Show } from "solid-js";
import { DataTable } from "../../../components/ui/data-table";
import { columns } from "../../../components/columnDefs/servers";

export const route = {
  preload: async (props) => {
    const serverList = await list();
    return { serverList };
  },
} as RouteDefinition;

export default function Servers() {
  // const socket = useSocket();
  const serverList = createAsync(() => list(), { initialValue: [] });

  const [search, setSearch] = useSearchParams();

  return (
    <div class="w-full h-full flex flex-col gap-2">
      <div class="flex flex-col w-full">
        <Show when={serverList()} fallback={<div class="">Loading...</div>}>
          {(servers) => (
            <div class="flex flex-col p-2 gap-2">
              <div class="flex flex-row items-center justify-between">
                <h2 class="text-lg font-bold">Servers</h2>
                <div class="flex flex-row items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger as={Button} size="sm" class="h-6 px-2 gap-1 items-center">
                      Options
                      <MenuIcon class="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <AddServerForm as={DropdownMenuItem} />
                      <DropdownMenuItem class="gap-2">
                        <PlusIcon class="size-3.5" />
                        Import Servers
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    size="icon"
                    class="size-6"
                    variant="secondary"
                    onClick={async () => {
                      await revalidate([list.key]);
                    }}
                  >
                    <RefreshIcon class="size-3.5" />
                  </Button>
                </div>
              </div>
              <div class="w-full flex-col gap-2">
                <DataTable
                  columns={columns}
                  data={servers()}
                  search={(search.query as string | undefined) ?? ""}
                  onSearch={(value) => setSearch({ query: value })}
                />
              </div>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}
