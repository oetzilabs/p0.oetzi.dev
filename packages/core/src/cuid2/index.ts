import { createId } from "@paralleldrive/cuid2";
import { Cuid2Schema } from "./schema";
export * from "./schema";

export const cuid2 = () => Cuid2Schema.make(createId());
