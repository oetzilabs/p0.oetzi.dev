import { Button } from "@/components/ui/button";
import { RouteDefinition } from "@solidjs/router";
import { createSignal, ErrorBoundary, onCleanup, onMount, Show, Suspense } from "solid-js";
import { list } from "../api/servers";
import Globe from "globe.gl";
import { TextField, TextFieldInput } from "../components/ui/text-field";
import Search from "lucide-solid/icons/search";
import { clientOnly } from "@solidjs/start";
import Loader2 from "lucide-solid/icons/loader-2";

const ClientGlobe = clientOnly(() => import("@/components/ClientGlobe"), { lazy: true });

// export const route = {
//   preload: async (props) => {
//     const serverList = await list();
//     return { serverList };
//   },
// } as RouteDefinition;

export default function Home() {
  return (
    <div class="flex items-center justify-center h-full grow -mt-56">
      <div class="flex flex-col items-center gap-8 w-max">
        <ErrorBoundary
          fallback={(err, reset) => (
            <div class="text-muted-foreground flex flex-col gap-1 items-center justify-center">
              <span>Upps, an Error occured.</span>
              <span>We couldn't load the Globe. Please try again later.</span>
            </div>
          )}
        >
          <Suspense fallback={"loading"}>
            <ClientGlobe fallback={<Loader2 class="size-4 animate-spin text-muted-foreground" />} />
          </Suspense>
        </ErrorBoundary>
        <div class="flex w-full gap-2">
          <TextField class="flex-grow w-max max-w-lg">
            <TextFieldInput placeholder="Search the world..." class="w-full max-w-full"></TextFieldInput>
          </TextField>
          <Button size="icon" class="">
            <Search class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
