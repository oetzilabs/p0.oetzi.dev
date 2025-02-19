import { HttpApi } from "@effect/platform";
import { ServersGroup } from "../routes/servers";
import { AuthGroup } from "../routes/auth";

export const AllApis = HttpApi.make("AllApis")
  // add the groups
  .add(ServersGroup)
  .add(AuthGroup);
