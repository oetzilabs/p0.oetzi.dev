import {
  ColumnDef,
  ColumnFiltersState,
  createSolidTable,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from "@tanstack/solid-table";

import { createSignal, For, Show } from "solid-js";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TextField, TextFieldInput } from "@/components/ui/text-field";
import { compareItems, RankingInfo, rankItem } from "@tanstack/match-sorter-utils";
import { SortingFn, sortingFns } from "@tanstack/solid-table";
import { Button } from "./button";

declare module "@tanstack/solid-table" {
  //add fuzzy filter to the filterFns
  interface FilterFns {
    fuzzy: FilterFn<unknown>;
  }
  interface FilterMeta {
    itemRank: RankingInfo;
  }
}

export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value);

  // Store the itemRank info
  addMeta({ itemRank });

  // Return if the item should be filtered in/out
  return itemRank.passed;
};

export const fuzzySort: SortingFn<any> = (rowA, rowB, columnId) => {
  let dir = 0;

  // Only sort by rank if the column has ranking information
  if (rowA.columnFiltersMeta[columnId]) {
    dir = compareItems(rowA.columnFiltersMeta[columnId]?.itemRank!, rowB.columnFiltersMeta[columnId]?.itemRank!);
  }

  // Provide an alphanumeric fallback for when the item ranks are equal
  return dir === 0 ? sortingFns.alphanumeric(rowA, rowB, columnId) : dir;
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  search: string;
  onSearch: (value: string) => void;
}

export function DataTable<TData, TValue>(props: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = createSignal<SortingState>([]);
  const [columnFilters, setColumnFilters] = createSignal<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = createSignal(props.search);
  const table = createSolidTable({
    get data() {
      return props.data;
    },
    get columns() {
      return props.columns;
    },
    globalFilterFn: "fuzzy",
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      get sorting() {
        return sorting();
      },
      get columnFilters() {
        return columnFilters();
      },
      get globalFilter() {
        return globalFilter();
      },
    },
  });

  return (
    <div>
      <div class="flex items-center py-2 w-max gap-2">
        <TextField class="w-full h-8">
          <TextFieldInput
            placeholder="Search all columns..."
            class="max-w-sm text-xs"
            value={globalFilter() ?? ""}
            onInput={(e) => {
              setGlobalFilter(e.currentTarget.value ?? "");
              props.onSearch(e.currentTarget.value ?? "");
            }}
          />
        </TextField>
        <Button
          size="sm"
          class="h-8"
          onClick={() => {
            setGlobalFilter("");
            props.onSearch("");
          }}
        >
          Reset
        </Button>
      </div>
      <div class="rounded-md border">
        <Table>
          <TableHeader>
            <For each={table.getHeaderGroups()}>
              {(headerGroup) => (
                <TableRow>
                  <For each={headerGroup.headers}>
                    {(header) => (
                      <TableHead colSpan={header.colSpan}>
                        <Show when={!header.isPlaceholder}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </Show>
                      </TableHead>
                    )}
                  </For>
                </TableRow>
              )}
            </For>
          </TableHeader>
          <TableBody>
            <Show
              when={table.getRowModel().rows?.length}
              fallback={
                <TableRow>
                  <TableCell colSpan={props.columns.length} class="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              }
            >
              <For each={table.getRowModel().rows}>
                {(row) => (
                  <TableRow data-state={row.getIsSelected() && "selected"}>
                    <For each={row.getVisibleCells()}>
                      {(cell) => <TableCell>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>}
                    </For>
                  </TableRow>
                )}
              </For>
            </Show>
          </TableBody>
        </Table>
      </div>
      <div class="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>
    </div>
  );
}
