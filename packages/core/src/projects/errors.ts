import { Effect, Schema } from "effect";

export class ProjectNotInStore extends Schema.TaggedError<ProjectNotInStore>()("ProjectNotInStore", {
  id: Schema.String,
}) {}

export class ProjectStoreDoesNotExist extends Schema.TaggedError<ProjectStoreDoesNotExist>()(
  "ProjectStoreDoesNotExist",
  {}
) {}

export class ProjectIdNotCuid2 extends Schema.TaggedError<ProjectNotInStore>()("ProjectNotInStore", {
  id: Schema.String,
}) {}

export class ProjectNotJson extends Schema.TaggedError<ProjectNotJson>()("ProjectNotJson", {
  json: Schema.String,
}) {}
