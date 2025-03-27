import { Server } from "@p0/core/src/server/models/servers/schemas";
import { ColumnDef } from "@tanstack/solid-table";
import { Button } from "../ui/button";
import ArrowUpDown from "lucide-solid/icons/arrow-up-down";

export const columns: ColumnDef<Server>[] = [
  {
    accessorKey: "name",
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
];
