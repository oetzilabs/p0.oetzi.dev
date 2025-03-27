import { A, useParams } from "@solidjs/router";
import { createAsync } from "@solidjs/router";
import { findById } from "@/api/servers";
import { Show, Suspense } from "solid-js";
import NotFound from "@/routes/[...404]";

export default function ServerPage() {
  const serverId = useParams().srv_id;
  const server = createAsync(() => findById(serverId), { initialValue: null });
  return (
    <Suspense>
      <Show when={server()} fallback={<NotFound />}>
        {(s) => (
          <div class="flex w-full flex-col h-content grow gap-2">
            <div class="flex w-full flex-col gap-1">
              <span class="text-lg font-semibold">Name: {s().name}</span>
              <span class="">Status: {s().status}</span>
              <div>
                <span>URL: </span>
                <A class="hover:underline" href={s().url} target="_blank">
                  {s().url}
                </A>
              </div>
            </div>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
