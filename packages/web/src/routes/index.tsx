import { createEffect, createSignal, For, onCleanup } from "solid-js";
import { useSocket } from "../components/Socket";
import { push } from "@solid-primitives/signal-builders";
import { type SocketEvents } from "@p0/core/src/server/socket/events";

export default function Home() {
  const socket = useSocket();
  const [serverCreated, setServerCreated] = createSignal<any[]>([]);

  createEffect(() => {
    // const unsubber = socket.subscribe("server.updated", (payload) => {
    //   const added = push(serverCreated, payload as SocketEvents.ServerPayload);
    //   setServerCreated(added);
    // });
    // onCleanup(() => {
    //   unsubber();
    // });
    // const x = socket.any_sub((payload) => setServerCreated(push(serverCreated, payload)));
    // const intv = setInterval(() => {
    //   socket.any_publish(JSON.stringify({ _tag: "MetricsRequest" }));
    // }, 1000);
    // onCleanup(() => {
    //   x();
    //   clearInterval(intv);
    // });
  });

  return (
    <main class="w-full h-screen flex flex-col p-2">
      <div class="p-2 border border-neutral-100 dark:border-neutral-800">Dashboard</div>
      <div class="flex flex-col">
        <For each={serverCreated()}>{(server) => <div>{JSON.stringify(server)}</div>}</For>
      </div>
    </main>
  );
}
