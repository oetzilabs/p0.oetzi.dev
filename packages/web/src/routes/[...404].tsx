import { A } from "@solidjs/router";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return (
    <div class="min-h-screen   flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8 text-center">
        <div class="mb-8">
          <h2 class="mt-6 text-6xl font-extrabold text-neutral-900 dark:text-neutral-100">404</h2>
          <p class="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-100">Page not found</p>
          <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Sorry, we couldn't find this person you're looking for.
          </p>
        </div>
        <div class="mt-8">
          <Button as={A} href="/" variant="secondary" size="sm" class="h-8 px-3">
            Go back home
          </Button>
        </div>
      </div>
      <div class="mt-16 w-full max-w-2xl">
        <div class="relative">
          <div class="relative flex justify-center">
            <span class="px-2  text-sm text-neutral-500 dark:text-neutral-400">
              If you think this is a mistake, please contact support
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
