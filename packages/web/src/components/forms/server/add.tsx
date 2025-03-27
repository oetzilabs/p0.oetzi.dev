import * as ServerApi from "@/api/servers";
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
import { TextField, TextFieldInput, TextFieldLabel } from "@/components/ui/text-field";
import { useAction, useSubmission } from "@solidjs/router";
import { createForm } from "@tanstack/solid-form";
import Loader2 from "lucide-solid/icons/loader-2";
import PlusIcon from "lucide-solid/icons/plus";
import { createSignal } from "solid-js";
import { Show } from "solid-js";

type AddServerFormProps = {
  as?: Parameters<typeof DialogTrigger>[0]["as"];
};

export default function AddServerForm(props: AddServerFormProps) {
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const addServer = useAction(ServerApi.create);
  const addingServer = useSubmission(ServerApi.create);

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
    <Dialog open={dialogOpen()} onOpenChange={setDialogOpen}>
      <DialogTrigger as={props.as} class="gap-2" closeOnSelect={false}>
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
              <AddServerForm.Field name="name">
                {(field) => (
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
              </AddServerForm.Field>
              <AddServerForm.Field name="url">
                {(field) => (
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
              </AddServerForm.Field>
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
              onClick={() => {
                setDialogOpen(false);
                AddServerForm.reset();
              }}
              type="button"
              class="h-6 px-2"
            >
              Cancel
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
  );
}
