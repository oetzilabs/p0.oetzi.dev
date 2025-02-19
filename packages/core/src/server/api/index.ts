import { HttpApi } from "@effect/platform";
import { ServersGroup } from "../routes/servers";
import { AuthGroup } from "../routes/sessions";

export const AllApis = HttpApi.make("AllApis")
  // add the groups
  .add(ServersGroup)
  .add(AuthGroup);
