import { findById } from "@/api/servers";
import { configList, seedDefaults } from "@/api/virtualmachine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NotFound from "@/routes/[...404]";
import { A, createAsync, revalidate, RouteDefinition, useAction, useParams, useSubmission } from "@solidjs/router";
import Loader2 from "lucide-solid/icons/loader-2";
import Plus from "lucide-solid/icons/plus";
import PackagePlus from "lucide-solid/icons/package-plus";
import Pencil from "lucide-solid/icons/pencil";
import { createSignal, For, Show, Suspense } from "solid-js";
import { ServerInfo, VirtualMachineInfo } from "@p0/core/src/db/schema";
import RefreshCcw from "lucide-solid/icons/refresh-ccw";
import X from "lucide-solid/icons/x";
import SeedIcon from "lucide-solid/icons/palette";
import { toast } from "solid-sonner";
import Settings from "lucide-solid/icons/settings";
import AddVirtualMachineForm from "@/components/forms/virtual_machine/add";
import Trash from "lucide-solid/icons/trash";
import Cpu from "lucide-solid/icons/cpu";
import MemoryStick from "lucide-solid/icons/memory-stick";
import { DropdownMenu } from "../../../../components/ui/dropdown-menu";
import { VirtualMachineDropdownMenu } from "../../../../components/menus/virtual_machine";
import { TextField, TextFieldInput } from "../../../../components/ui/text-field";
import { clientOnly } from "@solidjs/start";

const ServerTerminal = clientOnly(() => import("@/components/ServerTerminal"));

// Taken from https://coolors.co/f94144-f3722c-f8961e-f9c74f-90be6d-43aa8b-577590
const statusColors = {
  available: "#43aa8b",
  unavailable: "#577590",
  stopped: "#f94144",
  starting: "#f9c74f",
  stopping: "#f3722c",
  backing_up: "#f8961e",
  restoring: "#90be6d",
  unknown: "#577590",
} as Record<ServerInfo["status"], string>;
const vmStatusColors = {
  stopped: "#f94144",
  starting: "#f9c74f",
  stopping: "#f3722c",
  backing_up: "#f8961e",
  restoring: "#90be6d",
  unknown: "#577590",
  idle: "",
} as Record<NonNullable<VirtualMachineInfo["status"]>, string>;

export const route = {
  preload: async (props) => {
    const server = await findById(props.params.srv_id);
    const vmConfigNameList = await configList();
    return { server, vmConfigNameList };
  },
} as RouteDefinition;

const lookup = (vm: any, search: string) => JSON.stringify(vm).toLowerCase().includes(search.toLowerCase());

export default function ServerPage() {
  const serverId = useParams().srv_id;
  const server = createAsync(() => findById(serverId), { initialValue: null });

  const seedDefaultConfigurations = useAction(seedDefaults);
  const seedingDefaultConfigurations = useSubmission(seedDefaults);

  const [vmSearch, setVmSearch] = createSignal("");

  return (
    <Suspense fallback={<Loader2 class="size-4 text-muted-foreground animate-spin" />}>
      <Show when={server()} fallback={<NotFound />}>
        {(s) => (
          <div class="flex w-full flex-col h-content grow gap-2 ">
            <div class="flex w-full flex-col gap-4 border-b p-4 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black relative">
              <div class="absolute top-0 right-0 p-4 w-max h-max flex flex-row items-center justify-end z-20">
                <div class="flex flex-row gap-2">
                  <Button variant="secondary" size="icon" class="gap-2 size-8">
                    <Settings class="size-3" />
                  </Button>
                </div>
              </div>
              <div class="absolute bottom-0 right-0 p-4 w-max h-max flex flex-row items-center justify-end z-20">
                <div class="flex flex-row gap-2">
                  <Button size="icon" variant="secondary" class="gap-2 size-8">
                    <Pencil class="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    class="gap-2 size-8"
                    onClick={() => {
                      toast.promise(revalidate(findById.keyFor(serverId)), {
                        loading: "Reloading...",
                        success: "Reloaded!",
                        error: "Failed to reload!",
                      });
                    }}
                  >
                    <RefreshCcw class="size-3" />
                  </Button>
                </div>
              </div>
              <span class="text-6xl font-bold">{s().name}</span>
              <div class="flex flex-col gap-2">
                <Badge
                  class="w-max text-white"
                  style={{
                    "background-color": statusColors[s().status],
                  }}
                >
                  {s().status}
                </Badge>
                <div>
                  <A class="hover:underline" href={s().url} target="_blank">
                    {s().url}
                  </A>
                </div>
                <div class="flex flex-row gap-2 items-center justify-start">
                  <For
                    each={s()
                      .server_tags.map((t) => t.tag)
                      .filter((t) => !t.hidden)}
                    fallback={
                      <div class="flex flex-row gap-2 items-center justify-start">
                        <span class="text-muted text-sm italic">No tags found</span>
                        <Button size="sm" class="w-max gap-2 h-6 px-2" variant="secondary">
                          Add
                          <Plus class="size-4" />
                        </Button>
                      </div>
                    }
                  >
                    {(tag) => (
                      <div class="flex flex-row gap-2 items-center">
                        <span class="text-sm font-bold">{tag.title}</span>
                        <Button size="icon" variant="outline" class="gap-2 size-8">
                          <X class="size-3" />
                        </Button>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-2 p-2 border-b w-full">
              <div class="flex flex-col gap-2 w-full">
                <div class="flex flex-row gap-2 items-center justify-between">
                  <div class="w-max">
                    <span class="text-xl font-bold">Virtual Machines</span>
                  </div>
                  <div class="w-max flex flex-row items-center gap-1">
                    <AddVirtualMachineForm server_id={s().id} small />
                    <Show when={s().vms.length === 0}>
                      <Button
                        size="sm"
                        class="w-max gap-2 h-8"
                        variant="outline"
                        disabled={seedingDefaultConfigurations.pending ?? false}
                        onClick={() => {
                          toast.promise(seedDefaultConfigurations(s().id), {
                            loading: "Seeding...",
                            success: "Seeded!",
                            error: (e) => `Failed to seed default configurations: ${e.message}`,
                          });
                        }}
                      >
                        <span class="sr-only lg:not-sr-only">Seed Defaults</span>
                        <Show when={seedingDefaultConfigurations.pending} fallback={<SeedIcon class="size-4" />}>
                          <Loader2 class="size-4 animate-spin" />
                        </Show>
                      </Button>
                    </Show>
                  </div>
                </div>
              </div>
              <div class="flex flex-col gap-2 w-full">
                <TextField value={vmSearch()} onChange={(v) => setVmSearch(v)}>
                  <TextFieldInput placeholder="Search" />
                </TextField>
                <div class="grid w-full gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <For
                    each={s()
                      .vms.filter((vm) => vm.type === "jailed_vm")
                      .filter((vm) => lookup(vm, vmSearch()))}
                    fallback={
                      <div class="flex flex-col items-center justify-center w-full col-span-full gap-4 p-12 bg-muted/25 rounded border">
                        <span class="text-muted-foreground">There are currently no VMs on this server.</span>
                        <div class="flex flex-row gap-1">
                          <AddVirtualMachineForm server_id={s().id} />
                          <Button size="sm" class="w-max gap-2" variant="outline">
                            Import
                            <PackagePlus class="size-4" />
                          </Button>
                        </div>
                      </div>
                    }
                  >
                    {(vm) => (
                      <div class="flex flex-col gap-2 w-full border rounded">
                        <div class="flex flex-row gap-2 items-center justify-between w-full p-2">
                          <div class="w-max flex flex-row items-center gap-2 pl-2">
                            <div
                              class="size-2 rounded-full"
                              style={{ "background-color": vmStatusColors[vm.status ?? "unknown"] }}
                            ></div>
                            <A href={`/servers/${s().id}/vms/${vm.id}`} class="hover:underline font-semibold">
                              {vm.id}
                            </A>
                          </div>
                          <div class="flex flex-row gap-2 items-center justify-end">
                            <VirtualMachineDropdownMenu vm={vm} />
                          </div>
                        </div>
                        <div class="flex flex-col gap-2 w-full">
                          <div class="flex flex-row gap-2 border-t w-full p-2">
                            <div class="flex flex-col gap-1 w-full border-r">
                              <div class="flex flex-row items-center justify-start gap-2">
                                <span class="text-sm font-bold">Boot Source: </span>
                                <span class="text-xs">{vm.boot_source.name}</span>
                              </div>
                              <span class="text-xs italic text-muted-foreground">
                                {vm.boot_source.kernel_image_path}
                              </span>
                              <span class="text-xs italic text-muted-foreground">
                                {vm.boot_source.boot_args ?? "No boot args"}
                              </span>
                              <span class="text-xs italic text-muted-foreground">
                                {vm.boot_source.initrd_path ?? "No initrd"}
                              </span>
                            </div>
                            <div class="flex flex-col gap-1 w-full">
                              <span class="text-sm font-bold">Machine Config:</span>
                              <div class="flex flex-col gap-2 w-full">
                                <div class="flex items-center gap-2 text-sm">
                                  <Cpu class="size-4" />
                                  <span>{vm.machine_config.vcpu_count} vCPU</span>
                                </div>
                                <div class="flex items-center gap-2 text-sm">
                                  <MemoryStick class="size-4" />
                                  <span>{vm.machine_config.mem_size_mib} MiB</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-2 p-2 border-b w-full">
              <div class="flex flex-col gap-2 w-full">
                <div class="flex flex-row gap-2 items-center justify-between">
                  <div class="w-max">
                    <span class="text-xl font-bold">Workers</span>
                  </div>
                  <div class="w-max">
                    <Button size="icon" class="gap-2 size-8">
                      <Plus class="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div class="flex flex-col gap-2 w-full">
                <div class="grid w-full grid-cols-4">
                  <For
                    each={s().vms.filter((vm) => vm.type === "worker")}
                    fallback={
                      <div class="flex flex-col items-center justify-center w-full col-span-full gap-4 p-12 bg-muted/25 rounded border">
                        <span class="text-muted-foreground">There are currently no Workers on this server.</span>
                        <div class="flex flex-row gap-2">
                          <Button size="sm" class="w-max gap-2">
                            Create Worker
                            <Plus class="size-4" />
                          </Button>
                          <Button size="sm" class="w-max gap-2" variant="outline">
                            Import
                            <PackagePlus class="size-4" />
                          </Button>
                        </div>
                      </div>
                    }
                  >
                    {(vm) => <div class=""></div>}
                  </For>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-2 p-2 border-b w-full">
              <div class="flex flex-col gap-2 w-full">
                <div class="flex flex-row gap-2 items-center justify-between">
                  <div class="w-max">
                    <span class="text-xl font-bold">Terminal</span>
                  </div>
                  <div class="w-max">
                    {/* <Button size="icon" class="gap-2 size-8">
                      <Plus class="size-4" />
                    </Button> */}
                  </div>
                </div>
              </div>
              <div class="w-full flex flex-col">
                <div class="w-full flex flex-col px-2 bg-black rounded border">
                  <Suspense
                    fallback={
                      <div class="w-full flex flex-col items-center justify-center p-10">
                        <Loader2 class="size-4 animate-spin" />
                      </div>
                    }
                  >
                    <ServerTerminal
                      serverId={s().id}
                      fallback={
                        <div class="w-full flex flex-col items-center justify-center p-10">
                          <Loader2 class="size-4 animate-spin" />
                        </div>
                      }
                    />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
