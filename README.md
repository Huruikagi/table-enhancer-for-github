# GitHub Table Enhancer

A small Chrome extension that makes wide tables easier to read in GitHub Markdown file previews.

## Scope

- Runs on GitHub Markdown blob pages, such as `https://github.com/owner/repo/blob/main/docs/file.md`.
- Does not run on issues, pull requests, discussions, or repository README landing pages.
- Uses a content script only; no extra permissions are required.

## Local Install

1. Install dependencies with `pnpm install`.
2. Build the extension with `pnpm build`.
3. Open `chrome://extensions/`.
4. Enable Developer mode.
5. Click **Load unpacked**.
6. Select the generated `dist` folder.

## Development

```shell
mise install
pnpm install
pnpm build
pnpm check
pnpm lint
pnpm format
pnpm test
```

This project pins Node and pnpm in `.mise.toml`.

After rebuilding, reload the extension from `chrome://extensions/`.

## Manual Install Without Building

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select the `dist` folder after running `pnpm build`.

## Current Behavior

Markdown preview tables are wrapped in a horizontal scroll container so long cell content does not force every column to become narrow.
