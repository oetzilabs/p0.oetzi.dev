import { Server } from "@p0/core/src/server/models/servers/schemas";
import { ColumnDef } from "@tanstack/solid-table";
import { Button } from "../ui/button";
import ArrowUpDown from "lucide-solid/icons/arrow-up-down";
import { A } from "@solidjs/router";
import Settings from "lucide-solid/icons/settings";

export const columns: ColumnDef<Server>[] = [
  {
    accessorKey: "name",
    cell(props) {
      return (
        <div class="px-1">
          <A class="hover:underline" href={`/servers/${props.row.original.id}`}>
            {props.row.original.name}
          </A>
        </div>
      );
    },
    filterFn: "fuzzy",
    header: (props) => {
      return (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => props.column.toggleSorting(props.column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown class="ml-2 size-3" />
        </Button>
      );
    },
  },
  {
    accessorKey: "status",
    filterFn: "fuzzy",
    header: (props) => {
      return (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => props.column.toggleSorting(props.column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown class="ml-2 size-3" />
        </Button>
      );
    },
  },
  {
    accessorKey: "url",
    filterFn: "fuzzy",
    header: (props) => {
      return (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => props.column.toggleSorting(props.column.getIsSorted() === "asc")}
        >
          Url
          <ArrowUpDown class="ml-2 size-3" />
        </Button>
      );
    },
  },
  {
    accessorKey: "connections",
    filterFn: "fuzzy",
    header: (props) => {
      return (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => props.column.toggleSorting(props.column.getIsSorted() === "asc")}
        >
          Connections
          <ArrowUpDown class="ml-2 size-3" />
        </Button>
      );
    },
  },
  {
    accessorKey: "actions",
    header: "Actions",
    cell(props) {
      return (
        <div class="flex flex-row gap-2">
          <Button size="icon" variant="ghost" as={A} href={`/servers/${props.row.original.id}/settings`} class="size-6">
            <Settings class="size-3" />
          </Button>
        </div>
      );
    },
  },
];
