import { Effect, Schema } from "effect";

export class GitProjectStoreDoesNotExist extends Schema.TaggedError<GitProjectStoreDoesNotExist>()(
  "GitProjectStoreDoesNotExist",
  {}
) {}

export class GitProjectDoesNotExist extends Schema.TaggedError<GitProjectDoesNotExist>()("GitProjectDoesNotExist", {
  repository: Schema.String,
}) {}

export class GitCantUseBothBranchAndCommit extends Schema.TaggedError<GitCantUseBothBranchAndCommit>()(
  "GitCantUseBothBranchAndCommit",
  {
    branch: Schema.String,
    commit: Schema.String,
  }
) {}

export class InvalidGitUrl extends Schema.TaggedError<InvalidGitUrl>()("InvalidGitUrl", {
  repository: Schema.String,
  must_start_with: Schema.String,
}) {}
