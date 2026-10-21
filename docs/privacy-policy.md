---
title: Privacy Policy
permalink: /privacy-policy/
---

# Privacy Policy

Effective date: October 21, 2026

Table Enhancer for GitHub is an unofficial Chrome extension that improves readability and navigation for wide tables on GitHub Markdown blob file preview pages.

## Data Collection

Table Enhancer for GitHub does not collect, transmit, sell, or share user data.

## Local Storage

The extension uses Chrome's `storage` permission only to save the user's table display preferences locally in the user's browser with `chrome.storage.local`.

These preferences are used only by the extension to restore repository-specific, heading-based table freeze defaults on matching GitHub Markdown blob pages.

## Network Requests

The extension does not send network requests and does not load remote code.

## Website Access

The extension loads content scripts on GitHub pages matching this pattern so it can detect navigation into Markdown file previews without a full page reload:

```text
https://github.com/*
```

Table enhancement and metadata display activate only on Markdown blob file preview pages, such as `https://github.com/owner/repo/blob/main/docs/file.md`. Tables on GitHub issues, pull requests, discussions, and repository README landing pages remain unchanged. The metadata adapter reads the current file's already-loaded source only on supported Markdown blob pages.

## Changes

This policy may be updated when the extension's behavior changes. Updates will be published on this page.

## Contact

For questions about this privacy policy, open an issue in the project repository:

<https://github.com/Huruikagi/table-enhancer-for-github/issues>
