import { Server } from "@/components/Server";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TextField, TextFieldInput, TextFieldLabel } from "@/components/ui/text-field";
import { createAsync, revalidate, RouteDefinition, useAction, useSubmission } from "@solidjs/router";
import { createForm } from "@tanstack/solid-form";
import PlusIcon from "lucide-solid/icons/plus";
import RefreshIcon from "lucide-solid/icons/refresh-ccw";
import MenuIcon from "lucide-solid/icons/menu";
import Loader2 from "lucide-solid/icons/loader-2";
import { For, Show } from "solid-js";
import { create, list } from "../api/servers";

export const route = {
  preload: async (props) => {
    const serverList = await list();
    return { serverList };
  },
} as RouteDefinition;

export default function Home() {
  // const socket = useSocket();
  const serverList = createAsync(() => list(), { initialValue: [] });
  const addServer = useAction(create);
  const addingServer = useSubmission(create);

  const AddServerForm = createForm(() => ({
    defaultValues: {
      name: "",
      url: "",
    } as Parameters<typeof addServer>[0],
    onSubmit: async ({ value }) => {
      console.log(`Adding server ${value.name} with url ${value.url}`);
      await addServer(value);
    },
  }));

  return (
    <main class="w-full h-full flex flex-col gap-2">
      {/* <div class="p-2 border border-neutral-300 dark:border-neutral-700">Dashboard</div> */}
      <div class="flex flex-col border border-neutral-300 dark:border-neutral-700 w-full rounded-md">
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
                      <Dialog>
                        <DialogTrigger as={DropdownMenuItem} class="gap-2" closeOnSelect={false}>
                          <PlusIcon class="size-3.5" />
                          Add Server
                        </DialogTrigger>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            AddServerForm.handleSubmit();
                          }}
                        >
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add a new server</DialogTitle>
                              <DialogDescription></DialogDescription>

                              <div class="flex flex-col gap-2">
                                <AddServerForm.Field
                                  name="name"
                                  children={(field) => (
                                    <TextField onChange={field().handleChange}>
                                      <TextFieldLabel>Name</TextFieldLabel>
                                      <TextFieldInput
                                        class="h-8 px-2"
                                        name={field().name}
                                        value={field().state.value}
                                        onBlur={field().handleBlur}
                                      />
                                    </TextField>
                                  )}
                                />
                                <AddServerForm.Field
                                  name="url"
                                  children={(field) => (
                                    <TextField onChange={field().handleChange}>
                                      <TextFieldLabel>URL</TextFieldLabel>
                                      <TextFieldInput
                                        name={field().name}
                                        class="h-8 px-2"
                                        value={field().state.value}
                                        onBlur={field().handleBlur}
                                      />
                                    </TextField>
                                  )}
                                />
                              </div>
                              <div class="">
                                <Show when={addingServer.error}>
                                  {(err) => <div class="text-error-foreground text-sm">{err().message}</div>}
                                </Show>
                              </div>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => AddServerForm.reset()}
                                type="button"
                                class="h-6 px-2"
                              >
                                Reset
                              </Button>
                              <Button
                                size="sm"
                                class="h-6 px-2"
                                disabled={addingServer.pending ?? false}
                                type="button"
                                onClick={() => {
                                  AddServerForm.handleSubmit();
                                }}
                              >
                                <Show when={addingServer.pending} fallback="Submit">
                                  <Loader2 class="size-4 animate-spin" />
                                  Submitting...
                                </Show>
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </form>
                      </Dialog>
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
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <For each={servers()}>{(server) => <Server server={server} />}</For>
              </div>
            </div>
          )}
        </Show>
      </div>
    </main>
  );
}
