import { Schema } from "effect";

export const FileDownload = Schema.Struct({
  filename: Schema.String,
  exists: Schema.Boolean,
  from: Schema.URL,
  to: Schema.String,
});

export type FileDownload = Schema.Schema.Type<typeof FileDownload>;
