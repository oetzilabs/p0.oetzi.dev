import { Schema } from "effect";

export class BrokerNotFound extends Schema.TaggedError<BrokerNotFound>()("BrokerNotFound", {}) {}

export class BrokerAlreadyExists extends Schema.TaggedError<BrokerAlreadyExists>()("BrokerAlreadyExists", {}) {}

export class BrokerNotDeleted extends Schema.TaggedError<BrokerNotDeleted>()("BrokerNotDeleted", {}) {}

export class BrokerNotUpdated extends Schema.TaggedError<BrokerNotUpdated>()("BrokerNotUpdated", {}) {}

export class BrokerNotCreated extends Schema.TaggedError<BrokerNotCreated>()("BrokerNotCreated", {}) {}

export class BrokerAlreadyDeleted extends Schema.TaggedError<BrokerAlreadyDeleted>()("BrokerAlreadyDeleted", {}) {}
