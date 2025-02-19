import { HttpApiMiddleware, HttpApiSecurity, OpenApi } from "@effect/platform";
import { Unauthorized } from "../../utils/authorization";
import { Effect, Layer, Redacted } from "effect";
import { Actor, ActorRepository, CurrentActor } from "../../models/actors/repository";

// Create the Authorization middleware
export class Authorization extends HttpApiMiddleware.Tag<Authorization>()("@p0/core/authorization", {
  // Define the error schema for unauthorized access
  failure: Unauthorized,
  // Specify the resource this middleware will provide
  provides: CurrentActor,
  // Add security definitions
  security: {
    // ┌─── Custom name for the security definition
    // ▼
    actor_bearer: HttpApiSecurity.bearer.pipe(
      // Add a description to the security definition
      HttpApiSecurity.annotate(
        OpenApi.Description,
        "Please provide a valid Bearer token in order to communicate with this API"
      )
    ),
    // Additional security definitions can be added here.
    // They will attempt to be resolved in the order they are defined.
  },
}) {}

export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* (_) {
    yield* Effect.log("creating Authorization middleware");

    const repo = yield* _(ActorRepository);
    // Return the security handlers for the middleware
    return {
      // Define the handler for the Bearer token
      // The Bearer token is redacted for security
      actor_bearer: (bearerToken) =>
        Effect.gen(function* () {
          // yield* Effect.log("checking bearer token", Redacted.value(bearerToken));
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
