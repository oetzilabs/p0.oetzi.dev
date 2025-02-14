import { createId } from "@paralleldrive/cuid2";
import { type BuildExtraConfigColumns, Table } from "drizzle-orm";
import { type SQLiteColumnBuilderBase, type SQLiteTableExtraConfig } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";

export * as Utils from "./utils";

const defaults = (prefix: string) => ({
  id: t
    .text("id")
    .primaryKey()
    .$defaultFn(() => `${prefix}_${createId()}`),
  createdAt: t
    .int("created_at", {
      mode: "timestamp",
    })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: t.int("updated_at", {
    mode: "timestamp",
  }),
  deletedAt: t.int("deleted_at", {
    mode: "timestamp",
  }),
});

export function commonTable<
  TTableName extends string,
  TColumnsMap extends Record<string, SQLiteColumnBuilderBase>,
  TPrefix extends string,
>(
  name: TTableName,
  columns: TColumnsMap,
  prefix: TPrefix,
  extraConfig?: (
    self: BuildExtraConfigColumns<TTableName, TColumnsMap & ReturnType<typeof defaults>, "sqlite">,
  ) => SQLiteTableExtraConfig,
) {
  const combinedColumns = {
    ...columns,
    ...defaults(prefix),
  } as TColumnsMap & ReturnType<typeof defaults>;

  return t.sqliteTable<TTableName, typeof combinedColumns>(name, combinedColumns, extraConfig);
}
