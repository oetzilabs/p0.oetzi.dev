import { Schema } from "effect";
import { isCuid } from "@paralleldrive/cuid2";

export const Cuid2Schema = Schema.NonEmptyString.pipe(
  Schema.filter((text) => isCuid(text)),
  Schema.annotations({ identifier: "string" }),
  Schema.annotations({ jsonSchema: { type: "string" } }),
  Schema.brand("Cuid2")
);
export type Cuid2Schema = typeof Cuid2Schema.Type;
