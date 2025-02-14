import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { Servers } from "@p0/core/src/entities/servers";
import { Effect, Option, Schema } from "effect";

const GetServerByIdParamSchema = Schema.Struct({
  sid: Schema.String,
});

export const routers = [
  HttpRouter.get(
    "/servers",
    // Map the the Result of the getServers function to a Response as json
    Effect.gen(function* (_) {
      const servers = yield* Servers.all_non_deleted;
      const json = yield* HttpServerResponse.json(servers);
      return json;
    }),
  ),
  HttpRouter.post(
    "/servers",
    Effect.gen(function* (_) {
      const request = yield* _(HttpServerRequest.HttpServerRequest);
      const body = yield* _(request.json);

      const data = yield* Schema.decodeUnknown(Servers.CreateServerSchema)(body);

      // if (!data) return yield* HttpServerResponse.text("Wrong Payload", { status: 500 });

      const result = yield* Servers.create(data);

      if (Option.isNone(result)) return yield* HttpServerResponse.text("Server not found", { status: 404 });

      const json = yield* HttpServerResponse.json(result.value);
      return json;
    }),
  ),
  HttpRouter.del(
    "/servers/:sid",
    HttpRouter.schemaPathParams(GetServerByIdParamSchema).pipe(
      Effect.flatMap((params) =>
        Effect.gen(function* (_) {
          const server = yield* Servers.find_by_id(params.sid);
          if (Option.isNone(server)) return yield* HttpServerResponse.text("Server not found", { status: 404 });
          const result = yield* Servers.remove(server.value.id);
          if (Option.isNone(result))
            return yield* HttpServerResponse.text("Server could not be deleted", { status: 500 });
          const json = yield* HttpServerResponse.json(result.value);
          return json;
        }),
      ),
    ),
  ),
  HttpRouter.get(
    "/servers/:sid",
    HttpRouter.schemaPathParams(GetServerByIdParamSchema).pipe(
      Effect.flatMap((params) =>
        Effect.gen(function* (_) {
          const server = yield* Servers.find_by_id(params.sid);
          if (Option.isNone(server)) return yield* HttpServerResponse.text("Server not found", { status: 404 });
          const json = yield* HttpServerResponse.json(server.value);
          return json;
        }),
      ),
    ),
  ),
] as const;
