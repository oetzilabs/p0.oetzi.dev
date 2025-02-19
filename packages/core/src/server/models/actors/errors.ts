import { Schema } from "effect";

export class ActorNotFound extends Schema.TaggedError<ActorNotFound>()("ActorNotFound", {}) {}

export class ActorAlreadyExists extends Schema.TaggedError<ActorAlreadyExists>()("ActorAlreadyExists", {}) {}

export class ActorNotDeleted extends Schema.TaggedError<ActorNotDeleted>()("ActorNotDeleted", {}) {}

export class ActorNotUpdated extends Schema.TaggedError<ActorNotUpdated>()("ActorNotUpdated", {}) {}

export class ActorNotCreated extends Schema.TaggedError<ActorNotCreated>()("ActorNotCreated", {}) {}

export class ActorAlreadyDeleted extends Schema.TaggedError<ActorAlreadyDeleted>()("ActorAlreadyDeleted", {}) {}
