import { Schema } from "effect";
import { VmId } from "../schema";

export const JailerConfigSchema = Schema.Struct({
  jailerBinaryPath: Schema.String,
  firecrackerBinaryPath: Schema.String,
  socketPath: Schema.String,
  vmId: VmId,
});

export type JailerConfig = Schema.Schema.Type<typeof JailerConfigSchema>;
