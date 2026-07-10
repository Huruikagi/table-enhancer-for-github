# Chrome Web Store Listing Draft

## Short Description

An unofficial extension that makes wide tables easier to read in GitHub Markdown file previews.

## Detailed Description

Table Enhancer for GitHub is a small, unofficial Chrome extension for GitHub Markdown blob pages.

It improves wide Markdown tables in file previews by keeping them readable inside a horizontal scroll container. It also adds compact controls for freezing displayed rows and columns, hiding or filtering rows and columns temporarily, copying the currently visible table as Markdown, CSV, or TSV, fitting columns into readable widths, and resizing columns while reviewing large tables.

Current scope:

- Works on GitHub Markdown blob file preview pages, such as `https://github.com/owner/repo/blob/main/docs/file.md`.
- Does not run on issues, pull requests, discussions, repository README landing pages, or rendered Markdown outside GitHub blob views.
- Uses a content script on GitHub Markdown blob pages and the `storage` permission for local heading-based freeze defaults.
- Does not collect, transmit, sell, or share user data.

This project is not affiliated with, sponsored by, or endorsed by GitHub.
