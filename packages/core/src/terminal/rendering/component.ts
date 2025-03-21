import { Effect, SubscriptionRef } from "effect";

export interface Component<T> {
  readonly data: SubscriptionRef.SubscriptionRef<T>;
  readonly render: Effect.Effect<T, never, never>;
  readonly update: (f: (data: T) => T) => Effect.Effect<void, never, never>;
}

export const createComponent = <T>(defaultValue: T): Effect.Effect<Component<T>, never, never> => {
  return Effect.gen(function* (_) {
    const data = yield* SubscriptionRef.make(defaultValue);
    const render = SubscriptionRef.get(data);
    const update = (f: (data: T) => T) => SubscriptionRef.update(data, f);
    return {
      data,
      render,
      update,
    };
  });
};

export const DefaultComponent = createComponent<any>(undefined);
