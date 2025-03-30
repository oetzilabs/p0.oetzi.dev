import { eq, isNull } from "drizzle-orm";
import { Effect } from "effect";
import * as crypto from "node:crypto";
import { Database, DatabaseLive } from "../../../db";
import { server_terminals } from "../../../db/schema";
import {
  ServerTerminalAlreadyDeleted,
  ServerTerminalNotCreated,
  ServerTerminalNotDeleted,
  ServerTerminalNotFound,
} from "./errors";
import { CreateServerTerminalSchema, RemoveServerTerminalSchema } from "./schemas";

export class ServerTerminalRepository extends Effect.Service<ServerTerminalRepository>()(
  "@p0/core/server_terminal/repo",
  {
    effect: Effect.gen(function* (_) {
      const db = yield* _(Database);
      const create = (body: typeof CreateServerTerminalSchema.Type) =>
        Effect.gen(function* (_) {
          const token = crypto.randomBytes(32).toString("hex");
          const link = `/terminals/${token}`;
          const create_terminal = Effect.tryPromise(() =>
            db
              .insert(server_terminals)
              .values([Object.assign(body, { link })])
              .returning()
          );

          const _server_terminals = yield* create_terminal;

          if (_server_terminals.length !== 1) return yield* Effect.fail(new ServerTerminalNotCreated());
          yield* Effect.log("created terminal", _server_terminals[0]);
          const terminal = _server_terminals[0];

          if (!terminal) return yield* Effect.fail(new ServerTerminalNotCreated());
          return yield* Effect.succeed(terminal);
        });

      const safe_delete = (id: typeof RemoveServerTerminalSchema.Type) =>
        Effect.gen(function* (_) {
          const _server_terminals = yield* Effect.tryPromise(() =>
            db.select().from(server_terminals).where(eq(server_terminals.id, id)).limit(1).execute()
          );

          if (_server_terminals.length !== 1) return yield* Effect.fail(new ServerTerminalNotFound());

          const _terminal = _server_terminals[0];

          if (!_terminal) return yield* Effect.fail(new ServerTerminalNotFound());

          if (_terminal.deletedAt) return yield* Effect.fail(new ServerTerminalAlreadyDeleted());

          const updated_server_terminals = yield* Effect.tryPromise(() =>
            db
              .update(server_terminals)
              .set({ deletedAt: new Date() })
              .where(eq(server_terminals.id, _terminal.id))
              .returning()
          );

          if (updated_server_terminals.length !== 1) return yield* Effect.fail(new ServerTerminalNotDeleted());

          const terminal = updated_server_terminals[0];
          if (!terminal) return yield* Effect.fail(new ServerTerminalNotFound());

          return yield* Effect.succeed(terminal);
        });

      const remove = (id: typeof RemoveServerTerminalSchema.Type) =>
        Effect.gen(function* (_) {
          const _server_terminals = yield* Effect.tryPromise(() =>
            db.select().from(server_terminals).where(eq(server_terminals.id, id)).limit(1).execute()
          );

          if (_server_terminals.length !== 1) return yield* Effect.fail(new ServerTerminalNotFound());

          const _terminal = _server_terminals[0];

          if (!_terminal) return yield* Effect.fail(new ServerTerminalNotFound());

          if (_terminal.deletedAt) return yield* Effect.fail(new ServerTerminalAlreadyDeleted());

          const deleted_server_terminals = yield* Effect.tryPromise(() =>
            db.delete(server_terminals).where(eq(server_terminals.id, _terminal.id)).returning()
          );

          if (deleted_server_terminals.length !== 1) return yield* Effect.fail(new ServerTerminalNotDeleted());
          const terminal = deleted_server_terminals[0];
          if (!terminal) return yield* Effect.fail(new ServerTerminalNotFound());

          return yield* Effect.succeed(terminal);
        });

      const all_non_deleted = Effect.gen(function* (_) {
        const _server_terminals = yield* Effect.tryPromise(() =>
          db.select().from(server_terminals).where(isNull(server_terminals.deletedAt)).execute()
        );
        return _server_terminals;
      });

      const all = Effect.gen(function* (_) {
        const _server_terminals = Effect.tryPromise(() => db.select().from(server_terminals).execute());

        const terminals = yield* _server_terminals;

        return terminals;
      });

      const find_by_id = (id: string) =>
        Effect.gen(function* (_) {
          const get_terminal = Effect.tryPromise(() =>
            db.select().from(server_terminals).where(eq(server_terminals.id, id)).limit(1).execute()
          );
          const _server_terminals = yield* get_terminal;
          if (_server_terminals.length !== 1) return yield* Effect.fail(new ServerTerminalNotFound());

          const terminal = _server_terminals[0];
          if (!terminal) return yield* Effect.fail(new ServerTerminalNotFound());

          return yield* Effect.succeed(terminal);
        });

      return {
        create,
        remove,
        all_non_deleted,
        all,
        find_by_id,
        safe_delete,
      } as const;
    }),
    dependencies: [DatabaseLive],
  }
) {}
