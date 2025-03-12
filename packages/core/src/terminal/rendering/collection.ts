import { Effect, SubscriptionRef } from "effect";
import { createComponent, type Component } from "./component";

// Component Layers
export const TextComponent = createComponent<string>;
export type TextComponent = typeof TextComponent;

export const NumberComponent = createComponent<number>;
export type NumberComponent = typeof NumberComponent;

export const BooleanComponent = createComponent<boolean>;
export type BooleanComponent = typeof BooleanComponent;

type EventOpts<CT extends Component<any>, E extends keyof ButtonEvents> = {
  event: E;
  target: CT;
};

type ButtonEventNames = "click";

type ButtonEvents = {
  [K in ButtonEventNames]?: (opts: EventOpts<ButtonComponentType, K>) => Effect.Effect<void, never, never>;
};

// Use a type alias instead of ReturnType for better type inference
type ButtonComponentType = {
  data: SubscriptionRef.SubscriptionRef<string>;
  render: Effect.Effect<string, never, never>;
  update: (f: (data: string) => string) => Effect.Effect<void, never, never>;
  on: <E extends ButtonEventNames>(
    event: E,
    fn: (opts: EventOpts<ButtonComponentType, E>) => Effect.Effect<void, never, never>
  ) => Effect.Effect<void, never, never>;
  trigger: <E extends ButtonEventNames>(event: E) => Effect.Effect<void, never, never>;
};

export const ButtonComponent = (content: string) =>
  Effect.gen(function* (_) {
    const component = yield* createComponent(content);

    const onEvents = yield* SubscriptionRef.make<ButtonEvents>({});

    const on = <E extends ButtonEventNames>(
      event: E,
      fn: (opts: EventOpts<typeof component, E>) => Effect.Effect<void, never, never>
    ): Effect.Effect<void, never, never> =>
      Effect.gen(function* () {
        yield* SubscriptionRef.update(onEvents, (oldEvents) => ({
          ...oldEvents,
          [event]: (opts: EventOpts<typeof component, E>) => fn(opts),
        }));
      });

    const trigger = <E extends ButtonEventNames>(event: E): Effect.Effect<void, never, never> =>
      Effect.gen(function* () {
        const events = yield* SubscriptionRef.get(onEvents);
        const eventHandler = events[event];
        if (eventHandler) {
          yield* eventHandler({ event, target: component as ButtonComponentType });
        }
      });

    return {
      ...component,
      on,
      trigger,
    };
  });

export type ButtonComponent = typeof ButtonComponent;

export type ComponentCollection = TextComponent | NumberComponent | BooleanComponent | ButtonComponent;

// Example Usage
// const ExampleButton = Effect.gen(function* (_) {
//   const buttonComponent = yield* ButtonComponent("Hi :)");
//   yield* buttonComponent.on("click", ({ target }) => target.update((old_content) => old_content + "x"));
//   return buttonComponent;
// });
