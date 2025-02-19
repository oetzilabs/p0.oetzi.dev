import { HttpApiSchema } from "@effect/platform";
import { Layer, Schema } from "effect";

// Define a schema for the "Unauthorized" error
export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
  // Specify the HTTP status code for unauthorized errors
  HttpApiSchema.annotations({ status: 401 })
) {}
