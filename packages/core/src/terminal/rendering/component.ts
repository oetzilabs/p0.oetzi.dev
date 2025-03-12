import { Effect, SubscriptionRef } from "effect";

// Component Definition
export interface Component<T> {
  readonly data: SubscriptionRef.SubscriptionRef<T>;
  readonly render: Effect.Effect<T, never, never>;
  readonly update: (f: (data: T) => T) => Effect.Effect<void, never, never>;
}

// Component Factory Function
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

// Example Usage
// const example = Effect.gen(function*(_) {
//   const textComponent = yield* TextComponent("x")
//   const numberComponent = yield* NumberComponent(0)
//   const buttonComponent = yield* ButtonComponent("Hi :)")

//   // Initial values
//   const initialText = yield* _(textComponent.render)
//   const initialNumber = yield* _(numberComponent.render)
//   const initialButtonText = yield* _(buttonComponent.render)

//   yield* Effect.logInfo(initialText)
//   yield* Effect.logInfo(initialNumber)
//   yield* Effect.logInfo(initialButtonText)

//   // Update values
//   yield* _(textComponent.update(() => "Hello, World!"))
//   yield* _(numberComponent.update(() => 42))

//   // Get updated values
//   const updatedText = yield* _(textComponent.render)
//   const updatedNumber = yield* _(numberComponent.render)

//   yield* Effect.logInfo(updatedText)
//   yield* Effect.logInfo(updatedNumber)

//   // Simulate button click
//   if ("onClick" in buttonComponent) {
//     yield* _(buttonComponent.onClick())
//     const postClickButtonText = yield* _(buttonComponent.render)
//     yield* Effect.logInfo(postClickButtonText)
//   }
// })
