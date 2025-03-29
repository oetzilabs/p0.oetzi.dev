import * as VirtualMachineApi from "@/api/virtualmachine";
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
import { A, createAsync, useAction, useSubmission } from "@solidjs/router";
import { createForm } from "@tanstack/solid-form";
import Loader2 from "lucide-solid/icons/loader-2";
import PlusIcon from "lucide-solid/icons/plus";
import { createSignal, Show, Suspense } from "solid-js";
import { TextField, TextFieldInput, TextFieldLabel } from "../../ui/text-field";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../../ui/select";
import { Skeleton } from "../../ui/skeleton";
import { cn } from "../../../lib/utils";
import { toast } from "solid-sonner";
import { MachineConfig } from "@p0/vm/src/firecracker/schema";
import {
  NumberField,
  NumberFieldDecrementTrigger,
  NumberFieldGroup,
  NumberFieldIncrementTrigger,
  NumberFieldInput,
  NumberFieldLabel,
} from "../../ui/number-field";
import { CreateVirtualMachineConfig } from "@p0/core/src/server/models/vms/schemas";

type AddVirtualMachineFormProps = {
  server_id: string;
  small?: boolean;
};

export default function AddVirtualMachineForm(props: AddVirtualMachineFormProps) {
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const addVirtualMachine = useAction(VirtualMachineApi.create);
  const addingVirtualMachine = useSubmission(VirtualMachineApi.create);

  const addVirtualMachineConfig = useAction(VirtualMachineApi.createConfig);
  const addingVirtualMachineConfig = useSubmission(VirtualMachineApi.createConfig);

  const vmConfigNames = createAsync(() => VirtualMachineApi.configList(), { initialValue: [] as string[] });

  const VirtualMachineConfigForm = createForm(() => ({
    defaultValues: {
      bootSourceFile: null,
      mem_size_mib: 1024,
      vcpu_count: 1,
      server_id: props.server_id,
      jailed: true,
      type: "jailed_vm",
    } as CreateVirtualMachineConfig,
    onSubmit: async ({ value }) => {
      const bootSourceFile = value.bootSourceFile;
      if (bootSourceFile === null) throw new Error("No boot source file provided");
      toast.promise(addVirtualMachineConfig(Object.assign(value, { bootSourceFile })), {
        loading: "Adding...",
        success: "Added!",
        error: (e) => `Failed to add virtual machine: ${e.message}`,
      });
    },
  }));

  const AddVirtualMachineForm = createForm(() => ({
    defaultValues: {
      server_id: props.server_id,
      jailed: true,
      type: "jailed_vm",
      image: "",
    } as Parameters<typeof addVirtualMachine>[0],
    onSubmit: async ({ value }) => {
      toast.promise(addVirtualMachine(value), {
        loading: "Adding...",
        success: "Added!",
        error: (e) => `Failed to add virtual machine: ${e.message}`,
      });
    },
  }));

  return (
    <Dialog open={dialogOpen()} onOpenChange={setDialogOpen}>
      <DialogTrigger
        as={Button}
        size={props.small ? "icon" : "sm"}
        class={cn("gap-2", {
          "size-8": props.small,
        })}
      >
        <Show when={!props.small}>Add Virtual Machine</Show>
        <PlusIcon class="size-3.5" />
      </DialogTrigger>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          AddVirtualMachineForm.handleSubmit();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a new Virtual Machine</DialogTitle>
            <DialogDescription></DialogDescription>

            <div class="flex flex-col gap-2">
              <Suspense fallback={<Skeleton class="w-full" />}>
                <Show
                  when={vmConfigNames() && vmConfigNames().length > 0 && vmConfigNames()}
                  fallback={
                    <div class=" flex flex-col w-full gap-4">
                      <span class="text-sm text-muted-foreground w-full">
                        There are currently no configurations available. Please add a new one.
                      </span>
                      <div class="flex flex-col gap-4">
                        <div class="flex flex-col gap-2">
                          <span class="font-semibold text-sm">Boot Source</span>
                          <div class="w-full rounded border bg-muted p-10 flex items-center justify-center">
                            <VirtualMachineConfigForm.Field name="bootSourceFile">
                              {(field) => (
                                <input
                                  type="file"
                                  class="w-min"
                                  onBlur={field().handleBlur}
                                  multiple={false}
                                  accept=".zip,.tar.gz" /* These are the currently supported formats */
                                  onChange={(e) => {
                                    if (!e.target.files) return;
                                    field().setValue(e.target.files[0]);
                                  }}
                                />
                              )}
                            </VirtualMachineConfigForm.Field>
                          </div>
                        </div>
                        <div class="flex flex-col gap-2">
                          <span class="font-semibold text-sm">Machine Config</span>
                          <VirtualMachineConfigForm.Field name="mem_size_mib">
                            {(field) => (
                              <NumberField
                                minValue={128}
                                maxValue={4096}
                                defaultValue={128}
                                onChange={(v) => {
                                  let newValue = Number(v);
                                  if (isNaN(newValue)) return;
                                  field().setValue(newValue);
                                }}
                              >
                                <NumberFieldLabel>Memorize Size (MiB)</NumberFieldLabel>
                                <NumberFieldGroup>
                                  <NumberFieldInput onBlur={field().handleBlur} />
                                  <NumberFieldDecrementTrigger />
                                  <NumberFieldIncrementTrigger />
                                </NumberFieldGroup>
                              </NumberField>
                            )}
                          </VirtualMachineConfigForm.Field>
                          <VirtualMachineConfigForm.Field name="vcpu_count">
                            {(field) => (
                              <NumberField minValue={1} maxValue={16} defaultValue={1}>
                                <NumberFieldLabel>vCPU Count</NumberFieldLabel>
                                <NumberFieldGroup>
                                  <NumberFieldInput onBlur={field().handleBlur} />
                                  <NumberFieldDecrementTrigger />
                                  <NumberFieldIncrementTrigger />
                                </NumberFieldGroup>
                              </NumberField>
                            )}
                          </VirtualMachineConfigForm.Field>
                        </div>
                      </div>
                      <div class="flex flex-col gap-2 w-full pt-2 border-t">
                        <span class="text-sm text-muted-foreground w-full">
                          You can also{" "}
                          <A class="hover:underline underline-offset-2" href="/help?type=missing_vm_configs">
                            contact the administrator
                          </A>{" "}
                          to add a new configuration for you.
                        </span>
                      </div>
                    </div>
                  }
                >
                  {(names) => (
                    <AddVirtualMachineForm.Field name="image">
                      {(field) => (
                        <Select
                          value={field().state.value}
                          onBlur={field().handleBlur}
                          onChange={(v) => {
                            if (!v) return;
                            field().setValue(v);
                          }}
                          options={names()}
                          placeholder="Select a vm config"
                          itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
                          class="w-full"
                        >
                          <SelectLabel>VM Configuration</SelectLabel>
                          <SelectTrigger aria-label="Fruit" class="w-full">
                            <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                          </SelectTrigger>
                          <SelectContent class="w-full" />
                        </Select>
                      )}
                    </AddVirtualMachineForm.Field>
                  )}
                </Show>
              </Suspense>
            </div>
            <div class="">
              <Show when={addingVirtualMachine.error}>
                {(err) => (
                  <div class="text-error-foreground text-sm bg-error-foreground/25 rounded w-full p-2">
                    Error: {err().message}
                  </div>
                )}
              </Show>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDialogOpen(false);
                AddVirtualMachineForm.reset();
                addingVirtualMachine.clear();
              }}
              type="button"
              class="h-6 px-2"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              class="h-6 px-2"
              disabled={addingVirtualMachine.pending ?? false}
              type="button"
              onClick={() => {
                AddVirtualMachineForm.handleSubmit();
              }}
            >
              <Show when={addingVirtualMachine.pending} fallback="Submit">
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
