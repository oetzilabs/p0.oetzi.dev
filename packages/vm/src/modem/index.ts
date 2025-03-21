// I took inspiration from https://github.com/apocas/firecrackerode
import { Effect } from "effect";
import http from "http";
import { ModemPayloadError } from "./errors";
import { BaseLoggerLive, BaseLoggerService } from "@p0/core/src/logger";

export interface ModemOptions {
  socketPath: string;
  timeout: number;
  connectionTimeout: number;
  headers?: Record<string, string>;
}

interface DialOptions {
  path: string;
  method: string;
  headers?: Record<string, string>;
  data?: unknown;
  statusCodes: Record<number, boolean | string>;
}

type RequestOptions = http.RequestOptions;

export class HttpModemService extends Effect.Service<HttpModemService>()("@p0/vm/http-modem", {
  effect: Effect.gen(function* (_) {
    const base_logger = yield* _(BaseLoggerService);
    const logger = base_logger.withGroup("http-modem");
    const build = (modemOptions: ModemOptions) => {
      const buildRequestOptions = (options: DialOptions): RequestOptions => {
        const requestOptions: RequestOptions = {
          path: options.path,
          method: options.method,
          headers: Object.assign({}, options.headers),
          socketPath: modemOptions.socketPath,
        };

        requestOptions.headers!["Content-Type"] = "application/json";
        if (options.data) {
          const data = JSON.stringify(options.data);
          requestOptions.headers!["Content-Length"] = Buffer.byteLength(data).toString();
        }

        return requestOptions;
      };

      const buildRequest = (requestOptions: RequestOptions, context: DialOptions, data?: string) =>
        Effect.async<any, ModemPayloadError | Error>((resume) => {
          let connectionTimeoutTimer: ReturnType<typeof setTimeout>;
          const req = http.request(requestOptions, (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk) => {
              chunks.push(chunk);
            });

            res.on("end", () => {
              const buffer = Buffer.concat(chunks);
              const result = buffer.toString();

              let json: any;
              try {
                json = JSON.parse(result);
              } catch (e) {
                json = null;
              }
              if (context.statusCodes[res.statusCode as number] !== true) {
                resume(
                  Effect.fail(
                    ModemPayloadError.make({
                      message: `(HTTP code ${res.statusCode}) ${
                        context.statusCodes[res.statusCode as number] || "unexpected"
                      } - ${json?.fault_message || json}`,
                      statusCode: res.statusCode,
                      json,
                    })
                  )
                );
              } else {
                return resume(Effect.succeed(json));
              }
            });
          });

          if (modemOptions.connectionTimeout) {
            connectionTimeoutTimer = setTimeout(() => {
              req.destroy();
            }, modemOptions.connectionTimeout);
          }

          if (modemOptions.timeout) {
            req.on("socket", (socket) => {
              socket.setTimeout(modemOptions.timeout);
              socket.on("timeout", () => {
                req.destroy();
              });
            });
          }

          req.on("connect", () => {
            clearTimeout(connectionTimeoutTimer);
          });

          req.on("close", () => {
            clearTimeout(connectionTimeoutTimer);
          });

          req.on("error", (error) => {
            clearTimeout(connectionTimeoutTimer);
            resume(Effect.fail(error));
          });

          if (data) {
            req.write(data);
          }
          req.end();
        });

      const dial = (dialOptions: DialOptions) =>
        Effect.gen(function* () {
          const requestOptions = buildRequestOptions(dialOptions);
          const data = dialOptions.data ? JSON.stringify(dialOptions.data) : undefined;

          return yield* buildRequest(requestOptions, dialOptions, data);
        });
      return { dial };
    };

    return { build };
  }),
  dependencies: [BaseLoggerLive],
}) {}

export const HttpModemLive = HttpModemService.Default;
