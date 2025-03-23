import { Schema } from "effect";
import { VmId } from "../firecracker/schema";

export const JailerConfigSchema = Schema.Struct({
  jailerBinaryPath: Schema.String,
  firecrackerBinaryPath: Schema.String,
  vmId: VmId,
  root: Schema.String,
});

export type JailerConfig = Schema.Schema.Type<typeof JailerConfigSchema>;
