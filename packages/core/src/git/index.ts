import { Effect, pipe, Stream } from "effect";
import type { Git } from "./schema";
import { Command, FileSystem, Path } from "@effect/platform";
import { BaseLoggerService } from "../logger";
import { GitCantUseBothBranchAndCommit, GitProjectDoesNotExist, InvalidGitUrl } from "./errors";
import { env } from "bun";

export class GitService extends Effect.Service<GitService>()("@p0/core/git/repo", {
  effect: Effect.gen(function* (_) {
    const log = yield* _(BaseLoggerService);
    const logger = log.withGroup("git");
    const cwd = process.cwd();
    const path = yield* _(Path.Path);
    const fs = yield* _(FileSystem.FileSystem);

    const getSafeStoragePath = (projectId: string) => {
      const homeDir = env.HOME || env.USERPROFILE || "/tmp"; // Fallback to /tmp
      const baseDir = path.join(homeDir, ".p0", "projects"); // Consistent base directory
      const projectDir = path.join(baseDir, projectId);
      return projectDir;
    };

    const check_and_create_store = (hostnames: string[]) =>
      Effect.gen(function* (_) {
        for (const hostname of hostnames) {
          const store_path = path.join(cwd, "projects", hostname);
          const store_exists = yield* fs.exists(store_path);
          if (!store_exists) {
            yield* logger.info("git#check_and_create_store", `Creating store for ${hostname}`);
            yield* _(fs.makeDirectory(store_path, { recursive: true }));
          }
        }
      });

    const make_entity_directory = (hostname: string, entity: string) =>
      Effect.gen(function* (_) {
        const store_path = path.join(cwd, "projects", hostname);
        const entity_path = path.join(store_path, entity);
        const entity_exists = yield* fs.exists(entity_path);
        if (!entity_exists) {
          yield* logger.info("git#make_entity_directory", `Creating entity for ${hostname}/${entity}`);
          yield* _(fs.makeDirectory(entity_path, { recursive: true }));
        }
      });

    const simple_process = (cargs: string, env: Record<string, string>, workdir: string) =>
      Effect.gen(function* (_) {
        let main_command = "git";
        const command = Command.make(main_command, ...cargs.split(" ")).pipe(
          Command.workingDirectory(workdir),
          Command.env(env)
        );

        const _process = yield* pipe(
          Command.start(command),
          Effect.flatMap((_process) => {
            return Effect.gen(function* () {
              const stdoutStream = _process.stdout.pipe(Stream.decodeText("utf8"));
              const stderrStream = _process.stderr.pipe(Stream.decodeText("utf8"));

              yield* _(
                stdoutStream.pipe(
                  Stream.runForEach((line) => logger.info("git#simple_process", "cargs", cargs, "stdout", line))
                ),
                Effect.fork
              );

              yield* _(
                stderrStream.pipe(
                  Stream.runForEach((line) => logger.info("git#simple_process", "cargs", cargs, "stderr", line))
                ),
                Effect.fork
              );

              return _process;
            });
          })
        );

        return _process;
      });

    const clone = (git: Git) =>
      Effect.gen(function* (_) {
        const { repository, branch, commit, environment } = git;
        const env = environment ?? {};
        const entity_folder = git.repository.pathname.slice(1).split("/")[0];
        const safe_entity_folder = getSafeStoragePath(entity_folder);
        const safe_storage_path = getSafeStoragePath(git.repository.pathname.slice(1));

        const fs = yield* _(FileSystem.FileSystem);
        const path = yield* _(Path.Path);
        const log = yield* _(BaseLoggerService);
        const logger = log.withGroup("git");

        // Ensure the safe storage directory exists
        yield* fs.makeDirectory(safe_entity_folder, { recursive: true });
        yield* logger.info("git#clone", "safeStoragePath", safe_storage_path);

        // Clone the repository into the safe storage path
        const _process = yield* simple_process(`clone ${repository.toString()} .`, env, safe_entity_folder);

        if (branch && commit) {
          return yield* Effect.fail(
            GitCantUseBothBranchAndCommit.make({
              branch,
              commit,
            })
          );
        }

        if (branch && !commit) {
          yield* simple_process(`checkout ${branch}`, env, safe_storage_path);
        }

        if (commit && !branch) {
          yield* simple_process(`checkout ${commit}`, env, safe_storage_path);
        }

        yield* logger.info("git#clone", "pid", _process.pid);
        return safe_storage_path; // Return the safe storage path
      });

    const pull = (git: Git) =>
      Effect.gen(function* (_) {
        const working_directory = git.working_directory ?? getSafeStoragePath(git.repository.pathname.slice(1));

        const _process = yield* simple_process(`pull`, git.environment ?? {}, working_directory);

        yield* logger.info("git#pull", "pid", _process.pid);
        return _process;
      });

    const exists = (git: Git) =>
      Effect.gen(function* (_) {
        const projectExists = yield* fs.exists(getSafeStoragePath(git.repository.pathname.slice(1)));
        return projectExists;
      });

    const get_working_directory = (git: Git) =>
      Effect.gen(function* (_) {
        const [entity, repo_name] = git.repository.pathname.slice(1).split("/");
        if (!entity) {
          return yield* Effect.fail(GitProjectDoesNotExist.make({ repository: git.repository.toString() }));
        }
        if (!repo_name) {
          return yield* Effect.fail(GitProjectDoesNotExist.make({ repository: git.repository.toString() }));
        }
        return Effect.succeed(path.join(cwd, "projects", git.repository.hostname, entity, repo_name));
      });

    const toConfig = (url: string) =>
      Effect.gen(function* (_) {
        const _url = new URL(url);

        const [entity, repo_name] = _url.pathname.slice(1).split("/");
        if (!entity) {
          return yield* Effect.fail(GitProjectDoesNotExist.make({ repository: url }));
        }
        if (!repo_name) {
          return yield* Effect.fail(GitProjectDoesNotExist.make({ repository: url }));
        }

        return {
          repository: _url,
          working_directory: path.join(cwd, "projects", _url.hostname, entity, repo_name),
          environment: {},
        } satisfies Git;
      });

    const validateUrl = (url: string) =>
      Effect.gen(function* (_) {
        const valid_prefixes = {
          "github:": "https://github.com/",
          "github.com/": "https://github.com/",
        };

        const is_part_of_valid_prefixes = Object.keys(valid_prefixes).some((prefix) => url.startsWith(prefix));

        if (!is_part_of_valid_prefixes) {
          return yield* Effect.fail(
            InvalidGitUrl.make({
              repository: url,
              must_start_with: Object.keys(valid_prefixes).join(", "),
            })
          );
        }
        let url_ = url;
        for (const [prefix, valid_prefix] of Object.entries(valid_prefixes)) {
          if (url_.startsWith(prefix)) {
            url_ = url_.replace(prefix, valid_prefix);
          }
        }

        const checked_url = new URL(url_);
        if (!checked_url.hostname) {
          return yield* Effect.fail(GitProjectDoesNotExist.make({ repository: url }));
        }

        return yield* Effect.succeed({
          success: true,
          url: checked_url.toString(),
        });
      });

    const basename = (pathname: string) =>
      Effect.gen(function* (_) {
        const [__, repo_name] = pathname.slice(1).split("/");
        if (!repo_name) {
          return yield* Effect.fail(GitProjectDoesNotExist.make({ repository: pathname }));
        }
        return repo_name;
      });

    return {
      clone,
      pull,
      exists,
      validateUrl,
      toConfig,
      basename,
      get_working_directory,
      check_and_create_store,
      getSafeStoragePath,
    } as const;
  }),
  dependencies: [],
}) {}

export const GitLive = GitService.Default;
