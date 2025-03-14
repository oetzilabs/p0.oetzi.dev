import { Schema } from "effect";

export class FireCrackerDownloadFailed extends Schema.TaggedError<FireCrackerDownloadFailed>()(
  "FireCrackerDownloadFailed",
  {
    exitCode: Schema.Number,
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
}) {}
