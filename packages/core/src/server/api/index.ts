import { HttpApi } from "@effect/platform";
import { ServersGroup } from "../routes/servers";
import { SessionGroup } from "../routes/sessions";

export const AllApis = HttpApi.make("AllApis")
  // add the groups
  .add(ServersGroup)
  .add(SessionGroup);
