import { HttpApiMiddleware, HttpApiSecurity, OpenApi } from "@effect/platform";
import { Unauthorized } from "../../utils/authorization";
import { Effect, Layer, Redacted } from "effect";
import { Actor, ActorRepository, CurrentActor } from "../../models/actors/repository";

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()("@p0/core/authorization", {
  failure: Unauthorized,
  provides: CurrentActor,
  security: {
    actor_bearer: HttpApiSecurity.bearer.pipe(
      HttpApiSecurity.annotate(
        OpenApi.Description,
        "Please provide a valid Bearer token in order to communicate with this API"
      )
    ),
  },
}) {}

export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* (_) {
    yield* Effect.log("creating Authorization middleware");

    const repo = yield* _(ActorRepository);
    return {
      actor_bearer: (bearerToken) =>
        Effect.gen(function* () {
          const user = yield* repo.find_by_bearer_token(Redacted.value(bearerToken)).pipe(
            Effect.catchTags({
              ActorNotFound: () => Effect.fail(new Unauthorized()),
              UnknownException: () => Effect.fail(new Unauthorized()),
            })
          );
          if (!user) return yield* Effect.fail(new Unauthorized());
          const actor = new Actor({ id: user.id });
          return actor;
        }),
    };
  })
).pipe(Layer.provide(ActorRepository.Default));
