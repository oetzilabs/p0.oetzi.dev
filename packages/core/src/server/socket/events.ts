import { Schema as S } from "effect";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { PubSub } from "effect";

export const Operations = S.Literal("created", "updated", "deleted", "unknown");
export type Operations = typeof Operations.Encoded;

export const Entities = S.Literal(
  "system-notification",
  "unknown",
  "server",
  "broker",
  "load-balancer",
  "actor",
  "compute",
  "data"
);
export type Entities = typeof Entities.Encoded;

export type Events = `${Entities}.${Operations}`;

export namespace SocketEvents {
  export const UnknownPayload = S.Struct({
    data: S.Any,
  });
  export type UnknownPayload = typeof UnknownPayload.Encoded;
  export type Unknown = {
    type: "unknown";
    action: Operations;
    payload: UnknownPayload;
  };
  export const Unknown = S.Struct({
    type: S.Literal("unknown"),
    action: Operations,
    payload: UnknownPayload,
  });

  export const ServerPayload = S.Struct({
    id: S.String,
  });
  export type ServerPayload = typeof ServerPayload.Encoded;
  export type Server = {
    type: "server";
    action: Operations;
    payload: ServerPayload;
  };
  export const Server = S.Struct({
    type: S.Literal("server"),
    action: Operations,
    payload: ServerPayload,
  });

  export const NotificationInfo = S.Struct({
    message: S.String,
  });
  export type NotificationInfo = typeof NotificationInfo.Encoded;
  export type SystemNotification = {
    type: "systemnotification";
    action: Operations;
    payload: NotificationInfo;
  };
  export const SystemNotification = S.Struct({
    type: S.Literal("systemnotification"),
    action: Operations,
    payload: NotificationInfo,
  });

  export const Event = S.Union(Unknown, Server, SystemNotification);

  export type Event = Unknown | Server | SystemNotification;

  export type Events = {
    realtime: Event;
  };

  export interface EventsPubSub {
    readonly _: unique symbol;
  }

  export class EventsPubSub extends Context.Tag("@p0/core/socket/eventpubsub")<EventsPubSub, PubSub.PubSub<Event>>() {}

  export const EventsPubSubLive = Layer.effect(EventsPubSub, PubSub.unbounded<Event>());

  export const publish = (event: Event) => Effect.flatMap(EventsPubSub, (pubsub) => PubSub.publish(pubsub, event));

  export const subscribe = () => Effect.flatMap(EventsPubSub, (pubsub) => PubSub.subscribe(pubsub));
}
