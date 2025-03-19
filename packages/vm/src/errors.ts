import { Schema } from "effect";

export class FireCrackerDownloadFailed extends Schema.TaggedError<FireCrackerDownloadFailed>()(
  "FireCrackerDownloadFailed",
  {
    exitCode: Schema.Number,
    message: Schema.String,
  }
) {}

export class UnsupportedArchitecture extends Schema.TaggedError<UnsupportedArchitecture>()("UnsupportedArchitecture", {
  arch: Schema.String,
}) {}

export class FireCrackerExecutableNotFound extends Schema.TaggedError<FireCrackerExecutableNotFound>()(
  "FireCrackerExecutableNotFound",
  {}
) {}

export class FireCrackerFailedToMakeExecutable extends Schema.TaggedError<FireCrackerFailedToMakeExecutable>()(
  "FireCrackerFailedToMakeExecutable",
  {
    path: Schema.String,
  }
) {}

export class FireCrackerVmNotCreated extends Schema.TaggedError<FireCrackerVmNotCreated>()(
  "FireCrackerVmNotCreated",
  {}
) {}

export class FireCrackerFailedToBoot extends Schema.TaggedError<FireCrackerFailedToBoot>()("FireCrackerFailedToBoot", {
  path: Schema.String,
  message: Schema.String,
}) {}

export class FireCrackerDownloadNoUrlProvided extends Schema.TaggedError<FireCrackerDownloadNoUrlProvided>()(
  "FireCrackerDownloadNoUrlProvided",
  {}
) {}

export class FireCrackerFailedToMakeImages extends Schema.TaggedError<FireCrackerFailedToMakeImages>()(
  "FireCrackerFailedToMakeImages",
  {
    path: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Any),
  }
) {}

export class FireCrackerFailedToStartVM extends Schema.TaggedError<FireCrackerFailedToStartVM>()(
  "FireCrackerFailedToStartVM",
  {
    vmId: Schema.String,
    message: Schema.String,
  }
) {}
