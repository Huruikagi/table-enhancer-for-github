# AGENTS.md instructions

## Repository workflow

- After making meaningful changes in this workspace, run the relevant checks before finishing.
- Commit completed work with a concise message.
- Push committed work to the configured GitHub remote when the local branch has an upstream.
- Do not commit or push unfinished experiments unless the user explicitly asks for that.
- If checks cannot be run or push fails, report the reason clearly.

## Project commands

- Use `mise install` to install the pinned tool versions.
- Use `pnpm install` to install dependencies when needed.
- Use `pnpm check` for TypeScript checks.
- Use `pnpm lint` for linting and formatting checks.
- Use `pnpm format` to apply formatting.
- Use `pnpm test` for unit tests.
- Use `pnpm build` to build the Chrome extension into `dist`.
