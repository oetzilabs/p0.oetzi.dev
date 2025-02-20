import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { NotFound } from "@effect/platform/HttpApiError";
import { Schema } from "effect";

export class UnknownException extends Schema.TaggedError<UnknownException>()("UnknownException", {}) {}

const PageRouteFileParam = HttpApiSchema.param("file", Schema.String);

export class PageNotFound extends Schema.TaggedError<PageNotFound>()("PageNotFound", {
  route: Schema.String,
}) {}

export const PagesGroup = HttpApiGroup.make("Pages")
  .add(
    HttpApiEndpoint.get("file")`/${PageRouteFileParam}`
      .addError(UnknownException, { status: 500 })
      .addError(NotFound, { status: 404 })
      .addSuccess(Schema.Any)
  )
  .add(
    HttpApiEndpoint.get("asset")`/assets/${PageRouteFileParam}`
      .addError(UnknownException, { status: 500 })
      .addError(NotFound, { status: 404 })
      .addSuccess(Schema.Any)
  )
  .prefix("/pages");

// export const PagesRouter = HttpRouter.empty.pipe(
//   HttpRouter.all(
//     "*",
//     // @ts-ignore
//     Effect.map(HttpServerRequest.HttpServerRequest, (req) =>
//       HttpServerResponse.file(join(process.cwd(), `packages/core/src/server/pages/${req.url}`))
//     )
//   )
// );
