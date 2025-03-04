import { Schema } from "effect";
import { isCuid } from "@paralleldrive/cuid2";

export const Cuid2Schema = Schema.NonEmptyString.pipe(
  Schema.filter((text) => isCuid(text)),
  Schema.annotations({ identifier: "@p0/core/cuid2" }),
  Schema.brand("Cuid2")
);
