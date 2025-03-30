import { Schema } from "effect";

export class ServerTerminalNotFound extends Schema.TaggedError<ServerTerminalNotFound>()(
  "ServerTerminalNotFound",
  {}
) {}

export class ServerTerminalAlreadyExists extends Schema.TaggedError<ServerTerminalAlreadyExists>()(
  "ServerTerminalAlreadyExists",
  {}
) {}

export class ServerTerminalDeleted extends Schema.TaggedError<ServerTerminalDeleted>()("ServerTerminalDeleted", {}) {}

export class ServerTerminalNotDeleted extends Schema.TaggedError<ServerTerminalNotDeleted>()(
  "ServerTerminalNotDeleted",
  {}
) {}

export class ServerTerminalNotUpdated extends Schema.TaggedError<ServerTerminalNotUpdated>()(
  "ServerTerminalNotUpdated",
  {}
) {}

export class ServerTerminalNotCreated extends Schema.TaggedError<ServerTerminalNotCreated>()(
  "ServerTerminalNotCreated",
  {}
) {}

export class ServerTerminalAlreadyDeleted extends Schema.TaggedError<ServerTerminalAlreadyDeleted>()(
  "ServerTerminalAlreadyDeleted",
  {}
) {}
