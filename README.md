# Table Enhancer for GitHub

<p align="center">
  <img src="public/icons/icon128.png" width="128" height="128" alt="Table Enhancer for GitHub icon">
</p>

A small, unofficial Chrome extension that makes wide tables easier to read and review in GitHub Markdown file previews.

[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/gnnboemmkojioleagajnphgfdpdemjlg)

[Read the user guide](https://huruikagi.github.io/table-enhancer-for-github/user-guide/)

Issues and feature requests are welcome in English or Japanese.

## Scope

- Runs only on GitHub Markdown blob file preview pages, such as `https://github.com/owner/repo/blob/main/docs/file.md`.
- Does not run on issues, pull requests, discussions, repository README landing pages, or rendered Markdown outside GitHub blob views.
- Uses a content script on GitHub Markdown blob pages and the `storage` permission for heading-based freeze defaults.
- This project is not affiliated with, sponsored by, or endorsed by GitHub.

## Features

- Wraps Markdown preview tables in a horizontal scroll container so wide rows remain readable.
- Adds a compact Freeze control for keeping the first N displayed rows or columns visible while scrolling.
- Saves Freeze defaults per nearest preceding heading, then reapplies them when the same heading is viewed again.
- Lets you temporarily hide displayed rows or columns and restore them with Show hidden.
- Lets you temporarily filter table rows by case-insensitive text or regular expressions without saving the filter.
- Sorts body rows from column headers in ascending, descending, or original Markdown order.
- Lets you copy the currently visible table view as Markdown, CSV, or TSV.
- Lets you auto-fit displayed columns into readable widths with Fit.
- Expands an individual table into a full-window Focus mode without losing its current view state.
- Lets you drag column edges to resize displayed columns during review.
- Lets you reset a table view back to its initial display state.

## Local Install

1. Install the pinned tool versions with `mise install`.
2. Install dependencies with `pnpm install`.
3. Build the extension with `pnpm build` for production output, or `pnpm build:dev` for a development build with source maps.
4. Open `chrome://extensions/`.
5. Enable Developer mode.
6. Click **Load unpacked**.
7. Select the generated `dist` folder.

## Development

```shell
mise install
pnpm install
pnpm build:dev
pnpm build
pnpm check
pnpm lint
pnpm lint:fix
pnpm format
pnpm test
pnpm test:e2e
```

This project pins Node and pnpm in `.mise.toml`, and `package.json` pins the expected pnpm release through `packageManager`.

The content-script runtime and per-table state boundaries are documented in [docs/architecture.md](docs/architecture.md).

After rebuilding, reload the extension from `chrome://extensions/`.

`pnpm test:e2e` builds the extension in development mode and runs Playwright against a
Chromium profile with the generated `dist` extension loaded. The tests visit a GitHub Markdown
blob URL and serve a local GitHub-like fixture for that request, so the content script's
production URL match is exercised without depending on live GitHub pages.

## Manual Install Without Building

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select the `dist` folder after running `pnpm build`.

## Behavior

Markdown preview tables are wrapped in a horizontal scroll container so long cell content does not force every column to become narrow.
Each table gets compact controls above it. The Freeze panel can temporarily freeze the first N displayed rows and the first N left columns, reset those values, and save defaults for tables that have a preceding heading. Saved defaults apply only to matching headings in the same GitHub repository.

Hide buttons appear while hovering table cells. Row hide buttons appear on the first cell in each row, and column hide buttons appear on header cells. Hidden rows and columns are temporary and can be restored with Show hidden.

The Filter control can temporarily show only body rows whose row text contains a case-insensitive search term. Regular expression mode supports more precise matching and reports invalid expressions without hiding rows. Header rows stay visible, Clear filter restores filtered rows, and manually hidden rows remain hidden until Show hidden is used.

Hover a column header to reveal its unsorted sort button. Once selected, the ascending or descending direction remains visible. Repeated clicks cycle through ascending, descending, and original Markdown order. Numeric and date-like values are compared by value, while other text uses case-insensitive natural ordering. Sorting is temporary and keeps filters and manually hidden rows attached to the same rows.

The Copy as control writes the current visible table view to the clipboard as Markdown, CSV, or TSV. Rows hidden manually, rows hidden by the current filter, and hidden columns are omitted from the copied output.

Column resize handles appear on the table's header row. Dragging a handle changes that displayed column's width without changing the surrounding GitHub layout.
The Fit control applies readable column widths and wrapping in one step, while Reset table view clears temporary table changes, including sorting, and returns the table to its initial display.

The Expand control opens the current table in a full-window Focus mode while preserving filters, hidden rows and columns, wrapping, fitted widths, resized columns, and freeze settings. Click Close or press Escape to return to the GitHub file view.

For manual Chrome checks, use [docs/e2e-table-fixture.md](docs/e2e-table-fixture.md) from a GitHub Markdown blob page.

## Chrome Web Store

Install the published extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/gnnboemmkojioleagajnphgfdpdemjlg).

Chrome Web Store listing and privacy notes live in [docs/chrome-web-store-listing.md](docs/chrome-web-store-listing.md) and [docs/chrome-web-store-privacy.md](docs/chrome-web-store-privacy.md).

The public privacy policy page is [docs/privacy-policy.md](docs/privacy-policy.md). When GitHub Pages is enabled for the `docs` folder on `main`, the Chrome Web Store privacy policy URL is:

<https://huruikagi.github.io/table-enhancer-for-github/privacy-policy/>

## License

MIT
