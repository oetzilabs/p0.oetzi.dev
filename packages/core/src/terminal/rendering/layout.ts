import { Effect, SubscriptionRef } from "effect";
import { type Component, createComponent } from "./component";

type LayoutComponentType<T extends any = any> = {
  data: SubscriptionRef.SubscriptionRef<Component<T>[]>;
  render: (join?: string) => Effect.Effect<string, never, never>;
  update: (f: (data: Component<T>[]) => Component<T>[]) => Effect.Effect<void, never, never>;
};

export const LayoutComponent = <T extends any = any>(
  children: Component<T>[]
): Effect.Effect<LayoutComponentType<T>, never, never> =>
  Effect.gen(function* (_) {
    const component = yield* createComponent(children);
    const update = (f: (data: Component<T>[]) => Component<T>[]) => component.update((data) => f(data));
    const render = (join: string = "") =>
      Effect.gen(function* (_) {
        const renderers = yield* component.render;
        const texts = yield* Effect.all(renderers.map((x) => x.render));
        return texts.join(join);
      });
    return { ...component, render, update };
  });
