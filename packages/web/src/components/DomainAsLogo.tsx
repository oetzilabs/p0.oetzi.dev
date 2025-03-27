import { createAsync, query, useLocation } from "@solidjs/router";
import { isServer, Show, Suspense } from "solid-js/web";
import { getWebRequest } from "vinxi/http";
import { cn } from "../lib/utils";

const getDomainName = query(async () => {
  "use server";
  const url = new URL(getWebRequest().url);
  return url.hostname;
}, "domain");

export const DomainAsLogo = () => {
  const domain = createAsync(() => getDomainName(), { initialValue: "..." });

  return (
    <Suspense>
      <Show when={domain()}>
        {(d) => (
          <div
            class={cn(
              "bg-secondary/10 hover:bg-secondary/20 active:bg-secondary/50 rounded-sm p-2 w-full items-center flex justify-center font-bold text-xl border",
              {
                "bg-teal-200/20 hover:bg-teal-200/20 active:bg-teal-200/50 border-teal-200 text-teal-600":
                  d() === "localhost",
                "dark:bg-teal-900/10 dark:hover:bg-teal-900/20 dark:active:bg-teal-900/50 dark:border-teal-900 dark:text-teal-400":
                  d() === "localhost",
              }
            )}
          >
            {d()}
          </div>
        )}
      </Show>
    </Suspense>
  );
};
