import { Schema } from "effect";

export class ServerNotFound extends Schema.TaggedError<ServerNotFound>()("ServerNotFound", {}) {}
export class ServerAlreadyExists extends Schema.TaggedError<ServerAlreadyExists>()("ServerAlreadyExists", {}) {}
export class ServerDeleted extends Schema.TaggedError<ServerDeleted>()("ServerDeleted", {}) {}
export class ServerNotDeleted extends Schema.TaggedError<ServerNotDeleted>()("ServerNotDeleted", {}) {}
export class ServerNotUpdated extends Schema.TaggedError<ServerNotUpdated>()("ServerNotUpdated", {}) {}
export class ServerNotCreated extends Schema.TaggedError<ServerNotCreated>()("ServerNotCreated", {}) {}
export class ServerAlreadyDeleted extends Schema.TaggedError<ServerAlreadyDeleted>()("ServerAlreadyDeleted", {}) {}
