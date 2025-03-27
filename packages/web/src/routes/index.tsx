import { Button } from "@/components/ui/button";
import { A, RouteDefinition, useNavigate } from "@solidjs/router";
import Search from "lucide-solid/icons/search";
import { createSignal } from "solid-js";
import { TextField, TextFieldInput } from "../components/ui/text-field";

export const route = {} as RouteDefinition;

export default function Home() {
  const navigate = useNavigate();

  const [search, setSearch] = createSignal("");

  return (
    <div class="flex items-center justify-center h-full grow -mt-56">
      <div class="flex flex-col items-center gap-12 w-96">
        <div>
          <div class="size-80 rounded-full bg-teal-200/10 dark:bg-teal-900/10 border border-teal-300 dark:border-teal-800"></div>
        </div>
        <form class="flex w-full gap-2">
          <TextField class="w-full max-w-full">
            <TextFieldInput
              value={search()}
              onInput={(e) => {
                setSearch(e.currentTarget.value);
              }}
              placeholder="Search the world..."
              class="w-full max-w-full items-center"
            />
          </TextField>
          <Button size="icon" type="submit" as={A} href={`/servers/?query=${encodeURI(search())}`}>
            <Search class="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
