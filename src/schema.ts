import * as S from "effect/Schema";

// Define the user schema
export const Server = S.Struct({
  id: S.String,
  created_at: S.Date,
  updated_at: S.Date,
  deleted_at: S.Date,
});
