import { Data, Effect, Schema, String, SubscriptionRef } from "effect";
import { createId } from "@paralleldrive/cuid2";

export type ProjectStatusEnum = Data.TaggedEnum<{
  Loading: {};
  Registered: {};
  Stopped: { readonly reason: string };
  Running: {};
}>;

export const ProjectStatus = Data.taggedEnum<ProjectStatusEnum>();

export const ProjectId = Schema.String.pipe(
  Schema.annotations({ identifier: "@p0/core/project/id" }),
  Schema.brand("ProjectId")
);

export type ProjectId = Schema.Schema.Type<typeof ProjectId>;

export type ProjectProps = {
  id: ProjectId;
  name: string;
  path?: string;
  dev?: boolean | undefined;
  command?: [string, ...string[]] | string;
  start_automatically?: boolean | undefined;
  status: SubscriptionRef.SubscriptionRef<ProjectStatusEnum>;
};

export class Project extends Data.TaggedClass("@p0/core/project")<ProjectProps> {
  static make = (props: Omit<ProjectProps, "id" | "status">) =>
    Effect.gen(function* (_) {
      const id = ProjectId.make(createId());
      const status = yield* _(SubscriptionRef.make<ProjectStatusEnum>(ProjectStatus.Loading()));
      return new Project({ ...props, id, status });
    });
}
