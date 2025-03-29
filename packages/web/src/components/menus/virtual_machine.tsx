import { VirtualMachineInfo } from "@p0/core/src/db/schema";
import ListIcon from "lucide-solid/icons/list";
import Menu from "lucide-solid/icons/menu";
import RestartBox from "lucide-solid/icons/package-open";
import BoxPlus from "lucide-solid/icons/package-plus";
import PlayIcon from "lucide-solid/icons/play";
import RestartIcon from "lucide-solid/icons/refresh-cw";
import StopIcon from "lucide-solid/icons/stop-circle";
import Trash from "lucide-solid/icons/trash-2";
import HistoryIcon from "lucide-solid/icons/history";
import { For } from "solid-js";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { findById } from "../../api/servers";
import { remove } from "../../api/virtualmachine";
import Settings from "lucide-solid/icons/settings";
import { useAction, useSubmission } from "@solidjs/router";
import { toast } from "solid-sonner";

export const VirtualMachineDropdownMenu = (props: { vm: Awaited<ReturnType<typeof findById>>["vms"][number] }) => {
  const removeVirtualMachine = useAction(remove);
  const removingVirtualMachine = useSubmission(remove);
  return (
    <DropdownMenu placement="bottom-end">
      <DropdownMenuTrigger as={Button} size="icon" class="size-8" variant="secondary">
        <Menu />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>Actions</DropdownMenuGroupLabel>
          <DropdownMenuItem disabled={props.vm.status !== "idle"}>
            <PlayIcon class="size-4" />
            Start
          </DropdownMenuItem>
          <DropdownMenuItem>
            <StopIcon class="size-4" />
            Stop
          </DropdownMenuItem>
          <DropdownMenuItem>
            <RestartIcon class="size-4" />
            Reboot
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>Snapshots</DropdownMenuGroupLabel>
          <DropdownMenuItem>
            <BoxPlus class="size-4" />
            Create
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger class="gap-2 data-[disabled]:opacity-50" disabled={props.vm.snapshots.length === 0}>
              <HistoryIcon class="size-4" />
              Restore
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <For
                  each={props.vm.snapshots}
                  fallback={<DropdownMenuItem disabled>No snapshots found</DropdownMenuItem>}
                >
                  {(snapshot) => <DropdownMenuItem>{snapshot.snapshot_version}</DropdownMenuItem>}
                </For>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem>
            <ListIcon class="size-4" />
            List
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>Setup</DropdownMenuGroupLabel>
          <DropdownMenuItem>
            <Settings class="size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            class="hover:!text-destructive-foreground hover:!bg-destructive/90"
            onSelect={() => {
              toast.promise(removeVirtualMachine(props.vm.id, props.vm.server_id), {
                loading: "Removing...",
                success: "Removed!",
                error: (e) => `Failed to remove virtual machine: ${e.message}`,
              });
            }}
            disabled={removingVirtualMachine.pending ?? false}
          >
            <Trash class="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
