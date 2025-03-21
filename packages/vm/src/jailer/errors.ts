import { Schema } from "effect";

export class JailerMissingFirecrackerBinary extends Schema.TaggedError<JailerMissingFirecrackerBinary>()(
  "JailerMissingFirecrackerBinary",
  {
    message: Schema.String,
  }
) {}

export class JailerMissingSocketPath extends Schema.TaggedError<JailerMissingSocketPath>()("JailerMissingSocketPath", {
  message: Schema.String,
}) {}

export class JailerFailedToStart extends Schema.TaggedError<JailerFailedToStart>()("JailerFailedToStart", {
  message: Schema.String,
}) {}

export class JailerMissingJailerBinary extends Schema.TaggedError<JailerMissingJailerBinary>()(
  "JailerMissingJailerBinary",
  {
    message: Schema.String,
  }
) {}

export class JailerNotJailedYet extends Schema.TaggedError<JailerNotJailedYet>()("JailerNotJailedYet", {
  message: Schema.String,
}) {}
