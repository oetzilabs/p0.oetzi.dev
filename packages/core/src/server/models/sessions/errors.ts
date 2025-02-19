import { Schema } from "effect";

export class SessionNotFound extends Schema.TaggedError<SessionNotFound>()("SessionNotFound", {}) {}
export class SessionAlreadyExists extends Schema.TaggedError<SessionAlreadyExists>()("SessionAlreadyExists", {}) {}
export class SessionDeleted extends Schema.TaggedError<SessionDeleted>()("SessionDeleted", {}) {}
export class SessionNotDeleted extends Schema.TaggedError<SessionNotDeleted>()("SessionNotDeleted", {}) {}
export class SessionNotUpdated extends Schema.TaggedError<SessionNotUpdated>()("SessionNotUpdated", {}) {}
export class SessionNotCreated extends Schema.TaggedError<SessionNotCreated>()("SessionNotCreated", {}) {}
export class SessionAlreadyDeleted extends Schema.TaggedError<SessionAlreadyDeleted>()("SessionAlreadyDeleted", {}) {}
