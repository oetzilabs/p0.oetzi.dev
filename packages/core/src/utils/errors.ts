import { Schema } from "effect";

export class DownloadNoUrlProvided extends Schema.TaggedError<DownloadNoUrlProvided>()("DownloadNoUrlProvided", {}) {}
