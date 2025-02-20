import type { Accessor, JSX } from "solid-js";
import { createGlobalEmitter } from "@solid-primitives/event-bus";
import { createAsync } from "@solidjs/router";
import { createContext, createSignal, onCleanup, onMount, useContext } from "solid-js";
import { isServer } from "solid-js/web";
import { SocketEvents } from "@p0/core/src/server/socket/events";
// import { WebSocket, MessageEvent } from "ws";

type SocketType = {
  client: Accessor<WebSocket | null>;
  isConnected: () => boolean;
  subscribe: <
    T extends SocketEvents.Events["realtime"]["type"],
    P extends Extract<SocketEvents.Events["realtime"], { type: T }>["payload"],
    A extends Extract<SocketEvents.Events["realtime"], { type: T }>["action"],
    TA extends `${T}.${A}`
  >(
    target: TA,
    callback: (payload: P) => void
  ) => VoidFunction;
  publish: <
    T extends SocketEvents.Events["realtime"]["type"],
    P extends Extract<SocketEvents.Events["realtime"], { type: T }>["payload"],
    A extends Extract<SocketEvents.Events["realtime"], { type: T }>["action"]
  >(
    topic: T,
    payload: P,
    action: A
  ) => void;
  any_sub: (callback: (payload: any) => void) => VoidFunction;
  any_publish: (payload: any) => void;
};

export const SocketContext = createContext<SocketType>();

export type SocketProps = {
  children: JSX.Element;
  endpoint: string;
};

const globalEmitter = createGlobalEmitter<SocketEvents.Events>(); // Create a global event emitter
const globalEmitter2 = createGlobalEmitter(); // Create a global event emitter

export const Socket = (props: SocketProps) => {
  const [client, setClient] = createSignal<WebSocket | null>(null);
  const [isConnected, setIsConnected] = createSignal(false);

  const message_handler = (msg: MessageEvent) => {
    const c = client();
    if (!c) return;
    console.log("Received message:", msg);
    if (msg.data === "ping") {
      c.send("pong");
      return;
    }
    const { data } = msg;
    let pl = "";
    if (data instanceof ArrayBuffer) {
      const td = new TextDecoder();
      pl = td.decode(data);
    } else if (typeof data === "string") {
      pl = data;
    } else if (Array.isArray(data)) {
      // TODO: handle array data
      console.log("We did not expect Arrays yet", data);
    } else {
      console.log("Unknown data type:", data);
      return;
    }
    let payload: any;
    let action: any;
    let t: any;
    try {
      const p = JSON.parse(pl);
      payload = p.payload;
      action = p.action;
      t = p.type;
    } catch {
      payload = {};
      action = "unknown";
      t = "unknown";
    }

    // Emit the message through the global emitter
    globalEmitter.emit("realtime", { payload, action, type: t });
  };

  const alternative_handler = (msg: MessageEvent) => {
    const c = client();
    if (!c) return;
    console.log("Received message:", msg);
    if (msg.data === "ping") {
      c.send("pong");
      return;
    }

    try {
      const p = JSON.parse(msg.data);
      // Emit the message through the global emitter
      globalEmitter2.emit("realtime", p);
    } catch {
      console.error("Failed to parse message:", msg.data);
    }
  };

  onMount(() => {
    if (isServer) {
      console.log("RealtimeContext: realtime is not available on the server");
      return;
    }

    const ws = new WebSocket(`ws://${props.endpoint}`);

    // ws.addEventListener("message", message_handler);
    ws.addEventListener("message", alternative_handler);

    setClient(ws);
  });

  onCleanup(() => {
    const c = client();
    if (c) {
      // c.removeEventListener("message", message_handler);
      c.removeEventListener("message", alternative_handler);
      c.close();
      setIsConnected(false);
    }
  });

  return (
    <SocketContext.Provider
      value={{
        client,
        isConnected,
        // @ts-ignore
        subscribe: <
          T extends SocketEvents.Events["realtime"]["type"],
          P extends Extract<SocketEvents.Events["realtime"], { type: T }>["payload"],
          A extends Extract<SocketEvents.Events["realtime"], { type: T }>["action"],
          TA extends `${T}.${A}`
        >(
          target: TA,
          callback: (payload: P) => void
        ) => {
          const [type, action] = target.split(".") as [T, A];
          if (!type || !action) return;

          const unsubber = globalEmitter.on("realtime", (data) => {
            if (data.type === type && data.action === action) {
              // @ts-ignore
              callback(data.payload);
            }
          });
          return unsubber;
        },

        // @ts-ignore
        publish: <
          T extends SocketEvents.Events["realtime"]["type"],
          P extends Extract<SocketEvents.Events["realtime"], { type: T }>["payload"],
          A extends Extract<SocketEvents.Events["realtime"], { type: T }>["action"],
          TA extends `${T}.${A}`
        >(
          target: TA,
          payload: P
        ) => {
          const c = client();
          if (c) {
            const [topic, action] = target.split(".") as [T, A];
            if (!topic || !action) return;

            const message = JSON.stringify({ payload, action, type: topic });
            c.send(message);
          }
        },
        any_sub: (callback) => {
          const unsubber = globalEmitter2.on("realtime", callback);
          return unsubber;
        },
        any_publish: (payload) => {
          const c = client();
          if (c) {
            c.send(payload);
          }
        },
      }}
    >
      {props.children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("RealtimeContext is not set");
  }

  return ctx;
};
