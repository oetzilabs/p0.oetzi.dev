import { A, AnchorProps, useLocation, useResolvedPath } from "@solidjs/router";
import { For, JSX, Show, splitProps } from "solid-js";
import { cn } from "../lib/utils";
import { createMemo } from "solid-js";
import { isCuid } from "@paralleldrive/cuid2";

const Link = (props: AnchorProps & { last?: boolean }) => {
  const [local, others] = splitProps(props, ["href", "class", "last"]);

  return (
    <A
      class={cn("px-2 py-0.5 duration-100 transition-colors border-r last:border-none", local.class)}
      href={local.href}
      {...others}
    >
      {props.children}
    </A>
  );
};

export const Header = () => {
  const loc = useLocation();
  const paths = useResolvedPath(() => loc.pathname);

  const partsWithLinks = createMemo(() => {
    const path = paths() ?? "";
    const parts = path.split("/").filter(Boolean);

    let currentPath = "";
    return parts.map((part, index) => {
      currentPath += `/${part}`;
      const isLast = index === parts.length - 1;
      const is_Cuid = part.includes("_") ? isCuid(part.split("_")[1]) : false;
      return (
        <>
          <Link href={currentPath} class="w-max" last={isLast}>
            <Show when={is_Cuid} fallback={part}>
              {part.slice(0, 10)}...
            </Show>
          </Link>
        </>
      );
    });
  });

  const isNotHome = () => (paths() ?? "/") !== "/";

  return (
    <header class="w-min flex flex-row text-sm gap-2">
      <Show when={isNotHome()}>
        <div class="flex flex-row items-center select-none border rounded-md overflow-clip">
          <div class="flex flex-row items-center">
            <Link href="/">home</Link>
            <For each={partsWithLinks()}>{(part) => part}</For>
          </div>
        </div>
      </Show>
    </header>
  );
};
