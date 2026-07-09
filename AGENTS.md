# AGENTS.md instructions

## Repository workflow

- Before starting meaningful work on a branch with an upstream, fetch and fast-forward it when the worktree is clean.
- Use `git pull --ff-only` for this. Do not merge remote changes into a dirty worktree.
- In this Codex desktop Windows sandbox, run `git pull --ff-only` with escalated permission from the start when the worktree is clean and has an upstream, because sandboxed execution is expected to be blocked when writing `.git/FETCH_HEAD`.
- Treat that `.git/FETCH_HEAD` permission failure as an environment sandbox limitation, not a repository problem.
- If the branch cannot fast-forward or the worktree is dirty, report the situation instead of auto-resolving it.
- After pulling remote changes, if `.mise.toml` changed, run `mise install` before running checks.
- After pulling remote changes, if `package.json` or `pnpm-lock.yaml` changed, run `pnpm install` before running checks.
- After making meaningful changes in this workspace, run the relevant checks before finishing.
- Commit completed work with a concise message.
- Push committed work to the configured GitHub remote when the local branch has an upstream.
- Do not commit or push unfinished experiments unless the user explicitly asks for that.
- If checks cannot be run or push fails, report the reason clearly.
- When adding or changing user-visible table behavior, update `docs/e2e-table-fixture.md` as needed so manual Chrome E2E coverage stays current.

## Project commands

- Use `mise install` to install the pinned tool versions.
- Use `pnpm install` to install dependencies when needed.
- Use `pnpm check` for TypeScript checks.
- Use `pnpm lint` for linting and formatting checks.
- Use `pnpm format` to apply formatting.
- Use `pnpm test` for unit tests.
- Use `pnpm build` to build the Chrome extension into `dist`.
