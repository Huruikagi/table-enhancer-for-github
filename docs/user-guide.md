---
title: User Guide
permalink: /user-guide/
---

# Table Enhancer for GitHub: User Guide

Table Enhancer for GitHub is a small, unofficial Chrome extension for making wide tables easier to read in GitHub Markdown file previews. It adds controls directly above each eligible table, so you can focus on the information rather than constantly scrolling sideways.

[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/gnnboemmkojioleagajnphgfdpdemjlg)

<video controls preload="metadata" width="100%">
  <source src="{{ site.baseurl }}/store-assets/videos/github-table-enhancer-demo.webm" type="video/webm">
  Your browser does not support embedded video. Download the demo from the project repository instead.
</video>

## Where it works

The extension enhances tables only on GitHub Markdown blob pages, for example:

```text
https://github.com/owner/repository/blob/main/docs/guide.md
```

Tables on issues, pull requests, discussions, repository home pages, and Markdown rendered outside a GitHub blob view remain unchanged. Opening a supported preview from another GitHub page automatically applies the extension without reloading.

## Read YAML frontmatter

When a Markdown file starts with supported YAML frontmatter, the extension shows its properties
in a collapsible **Metadata** panel. Select the panel heading to collapse or expand it. Short
lists appear as tags; nested properties and longer lists can be expanded individually.

Frontmatter is identified from Markdown already loaded by the current GitHub page, without
additional network requests. If the source cannot be confirmed or the YAML is unsupported, the
original GitHub display is preserved. Nested tables and ambiguous leading key/value tables do
not receive table controls; ordinary body tables keep their usual controls.

## Start with the table controls

Open a Markdown file containing a table. Table Enhancer places a compact toolbar immediately above each table. The table stays inside its own horizontal scroll area, preserving the surrounding GitHub page layout.

![A GitHub Markdown table with Table Enhancer controls above it.]({{ site.baseurl }}/store-assets/screenshots/user-guide-overview.png)

The toolbar provides Freeze, Filter, Copy as, Select rows, Fit, Wrap, Reset, and Focus mode. When rows or columns are hidden, it also shows **Show hidden**.

The extension UI follows Chrome's display language. English is the default; Japanese, Simplified Chinese, Korean, Brazilian Portuguese, and Spanish are also supported. If a translated message is unavailable, the English message is shown.

## Follow a row and column

Hover a cell to softly highlight its row and column. The cell under the pointer gets a stronger tint, helping you follow wide tables back to their row label and column heading. Highlights follow scrolling and disappear when you leave the table. They work with hidden columns, sorting, frozen cells, row selection, and Focus mode, and do not change copied content or saved settings.

![A hovered cell highlighting its row and column.]({{ site.baseurl }}/store-assets/screenshots/user-guide-hover.png)

## Freeze rows and columns

Select **Freeze** to keep the first displayed rows and leftmost columns in view as you scroll. Enter the number of rows and columns to freeze; use **Reset** in the panel to clear only the freeze settings.

![The Freeze panel showing one frozen row and one frozen column.]({{ site.baseurl }}/store-assets/screenshots/user-guide-freeze.png)

If a table has a preceding heading, choose **Save default** to remember those freeze values for tables under the same heading in the same GitHub repository. Defaults are stored locally in your browser and can be changed at any time; they do not apply to other repositories, even when the heading text matches.

Freeze defaults saved by older versions were keyed only by heading text. They are not migrated because their repository cannot be determined safely. Save the default again after updating to use the new repository-specific rule.

## Filter a table without changing it

Choose the filter icon and type a word or phrase. Matching is case-insensitive and happens immediately. Select the **Use regular expression** (`.*`) button to interpret the input as a regular expression; invalid expressions leave all rows visible and show an error. The header remains visible, and **Clear filter** restores all rows that were not manually hidden.

![The filter panel displaying only rows that match ready.]({{ site.baseurl }}/store-assets/screenshots/user-guide-filter.png)

Filtering is temporary and is not saved as a default.

## Sort table rows

Hover a column header to reveal its unsorted sort button, then select it to sort the table body by that column. Once selected, the ascending or descending direction remains visible. Repeated selections cycle through ascending, descending, and original Markdown order. Numeric and date-like values are compared by value; other text uses case-insensitive natural ordering.

Sort and column-hide buttons sit side by side above the header text, leaving the column edge available for resizing even when a column is narrow.

Sorting is temporary. It preserves the identity of manually hidden and filtered rows as their positions change.

## Hide and restore rows or columns

Choose **Select rows** to show checkboxes in the first visible column. Currently visible body rows start checked; headers remain visible. The header checkbox selects or clears all visible body rows and shows a mixed state when only some are selected.

- To keep a few rows, clear all with the header checkbox, then check the rows you want.
- To hide a few rows, uncheck those rows.
- Choose **Show selected rows** to apply, or **Cancel** / <kbd>Escape</kbd> to discard the selection. Rows stay visible until you apply. Applying with no rows checked hides all current body rows; **Show hidden** restores them.

Selection applies only to the current visible rows, preserving existing filters and hidden items. Changing the filter or hiding a column cancels an unfinished selection; sorting keeps selections attached to the same rows. Use **Show hidden** before selecting again if you want to include previously hidden rows.

![Selecting rows before applying the view.]({{ site.baseurl }}/store-assets/screenshots/user-guide-row-selection.png)

Hover a header cell to reveal its column hide button. Hidden items are removed only from your current table view.

![A table with a hidden column and the Show hidden control available.]({{ site.baseurl }}/store-assets/screenshots/user-guide-hide-and-restore.png)

Select **Show hidden** to restore every hidden row and column in that table. Select **Reset table view** to clear hidden items along with the other temporary table changes.

## Fit, wrap, and resize columns

Use **Fit** to apply readable widths to the displayed columns and wrap long content. Use **Wrap** to turn wrapping on or off without recalculating widths. You can also drag a column edge in the header row to choose a width yourself.

![A wide table after Fit has enabled wrapping and chosen readable column widths.]({{ site.baseurl }}/store-assets/screenshots/user-guide-fit-and-wrap.png)

These changes affect only the current view in your browser; they never modify the GitHub file.

## Copy the view you are reviewing

Select **Copy as** and choose Markdown, CSV, or TSV. The copied content reflects the table as currently shown: manually hidden rows and columns, as well as rows hidden by filtering, are omitted.

This makes it easy to paste a focused subset into a comment, spreadsheet, or another Markdown document.

## Focus mode

Select the expand icon to open one table in a full-window workspace. Focus mode keeps your current filter, hidden items, wrapping, widths, and freeze settings. A persistent Focus mode indicator reminds you that you can select **Close** or press <kbd>Escape</kbd> to return to the GitHub file.

![A table open in full-window Focus mode.]({{ site.baseurl }}/store-assets/screenshots/user-guide-focus-mode.png)

## Reset a table view

The reset icon returns the table to its initial display state. It clears temporary filters, sorting, hidden rows and columns, wrapping, fitted or resized widths, and freeze settings. Saved heading defaults are not deleted.

## Keeping this guide accurate

The screenshots on this page are generated by Playwright with the built extension loaded, using a deterministic GitHub-style fixture. Maintainers can refresh them after a UI change with:

```powershell
pnpm guide:screenshots
```

The command writes changed images to `docs/store-assets/screenshots/`, ready for GitHub Pages deployment. Existing images whose rendered pixels are unchanged are left untouched, so they do not become Git changes because of PNG encoding differences.
