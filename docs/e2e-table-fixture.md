# E2E Table Fixture

Use this page to manually verify the extension on an actual GitHub Markdown blob page in Chrome.

The separate `pnpm demo:video` command records the store presentation scenario. It uses a deterministic local fixture and writes the generated WebM to `docs/store-assets/videos/github-table-enhancer-demo.webm`.

## Expected Behavior

- Each table should remain readable inside the GitHub Markdown preview.
- Wide tables should scroll horizontally instead of forcing every column to become narrow.
- Normal-width tables should still look like regular GitHub Markdown tables.
- Each enhanced table should show a compact Freeze control above the table.
- Opening the Freeze control should show a popup below the button with inputs for frozen rows and frozen columns.
- Tables with a preceding heading should show a Save default button in the Freeze control. Saved defaults apply only within the current repository.
- Tables without a preceding heading should not offer Save default.
- Clicking Save default should persist the current rows and columns for the nearest preceding heading text.
- Reloading the page should apply the saved default to tables with the same preceding heading text.
- Hovering a table header cell should show its column hide button and unsorted sort button.
- Hovering the first cell in a row should show a row hide button.
- Dragging a column edge should resize that displayed column without changing the surrounding GitHub layout.
- Clicking Fit should set readable column widths and enable wrapped cell rendering in one step.
- Clicking Wrap should switch resized cells from ellipsis clipping to wrapped content.
- Clicking a hide button should remove that displayed row or column without changing the surrounding GitHub layout.
- Clicking a column header sort button should cycle body rows through ascending, descending, and original Markdown order while leaving header rows in place.
- Show hidden should restore hidden rows and columns.
- Clicking Filter should show and focus a Filter rows input. Typing a runtime, package, status, or keyword should temporarily show only matching body rows while keeping header rows visible.
- The `.*` button should toggle regular-expression matching. A valid expression should match rows case-insensitively, while an invalid expression should show an error and leave all rows visible.
- Pressing Escape inside Freeze, Filter, or Copy as should close the popup and return focus to its button.
- Icon-only controls should expose a descriptive tooltip on hover and an accessible name to assistive technology.
- Controls should be ordered by task: Freeze, Filter, Copy as, Fit, Wrap, restore/reset actions, then Expand.
- Clear filter should restore rows hidden only by the filter, while manually hidden rows remain hidden until Show hidden is clicked.
- Clicking Copy as should offer Markdown, CSV, and TSV copy actions.
- Copy as should copy only the current visible table view, excluding hidden rows, filtered rows, and hidden columns.
- Opening Freeze, Filter, or Copy as while another panel is open should close the previously open panel.
- Setting frozen rows should keep the first N displayed rows visible while scrolling vertically.
- Frozen rows should stay visually contained to the table area and should not cover GitHub file action controls while the page itself scrolls.
- Frozen cells should keep normal-weight table grid lines visible while covering scrolled content behind them.
- The last frozen row should show a clear bottom separator while the table scrolls vertically.
- When frozen rows are enabled, long tables may scroll vertically inside the table wrapper.
- Setting frozen columns should keep the first N left columns fully visible while scrolling horizontally, including after dragging the table scrollbar away from the left edge.
- The last frozen column should show a clear right separator while the table scrolls horizontally.
- Reset should return both freeze values to `0` and remove sticky row and column behavior.
- Reset table view should restore the current table to its initial display by clearing freeze, hidden rows and columns, filters, wrap, fitted widths, and resized column widths.
- Clicking Expand should show only that table in a full-window Focus mode while preserving its current filter, visibility, sizing, wrapping, and freeze state.
- Clicking Close or pressing Escape should leave Focus mode and restore the GitHub file view without resetting the table state.

## Wide Release Matrix

| Repository | Branch | Runtime | Package Manager | Install Command | Check Command | Build Command | Artifact Path | Very Long Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `owner/github-table-enhancer` | `main` | Node.js 22.16.0 | pnpm 9.15.0 | `pnpm install --frozen-lockfile` | `pnpm lint && pnpm test && pnpm build` | `pnpm build` | `dist/manifest.json` | This row is intentionally long so the rendered table should be wider than the viewport on a normal laptop browser window. |
| `owner/github-table-enhancer` | `feature/manual-e2e-fixture` | Chrome stable | Chrome extension loader | Open `chrome://extensions/`, enable Developer mode, click Load unpacked, and select `dist` | Open this Markdown blob page on GitHub | Reload the extension after every rebuild | `dist/content.js` | Confirm that the horizontal scrollbar appears on the table wrapper and that the page itself does not become awkwardly wide. |
| `owner/github-table-enhancer` | `release/manual-check` | GitHub Markdown preview | N/A | N/A | Open `https://github.com/owner/repo/blob/main/docs/e2e-table-fixture.md` | N/A | N/A | The extension is scoped to Markdown blob pages, so this file should be opened from the repository file view instead of the README landing page. |

## Long Unbroken Values

| Case | Value | Expected Result |
| --- | --- | --- |
| Long URL | `https://github.com/example-org/example-repository/blob/main/docs/releases/2026/07/07/manual-chrome-e2e-verification-with-a-very-long-path-and-query-string.md?plain=1#wide-table-behavior` | The long URL should not make all other columns unreadably narrow. |
| Long token-like text | `github_table_enhancer_manual_e2e_fixture_value_000000000111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999` | The row should be horizontally scrollable when needed. |
| Long code command | `pnpm build --filter github-table-enhancer --reporter append-only --workspace-concurrency 1 --config.confirmModulesPurge false` | Inline code should remain visible without wrapping into many tiny pieces. |

## Mixed Markdown Content

| Status | Link | Inline Code | Emphasis | Notes |
| --- | --- | --- | --- | --- |
| Ready | [GitHub Markdown blob page](https://github.com/) | `data-github-table-enhancer="true"` | **important** | This row includes common Markdown formatting inside cells. |
| Needs rebuild | [Chrome extensions page](chrome://extensions/) | `dist/content.js` | _manual step_ | Chrome blocks direct links to internal pages, but the text is useful during manual testing. |
| Regression check | [README](../README.md) | `.markdown-body table` | **wide table** | Use this to compare against a smaller table below. |

## Long Table For Frozen Rows

Set Frozen rows to `1` or `2`. The table wrapper should scroll vertically while the frozen row stays visible.

| Step | Area | Command Or Check | Expected Result |
| --- | --- | --- | --- |
| 01 | Setup | Open this fixture from a GitHub Markdown blob page. | The Freeze control appears above this table. |
| 02 | Setup | Open the Freeze control. | Rows and Columns inputs are visible, and the Rows input is focused. |
| 02a | Keyboard | Focus the Rows or Columns input, then press Escape. | The Freeze control panel closes and focus returns to the Freeze button. |
| 02b | Narrow viewport | Resize the viewport until the Freeze panel no longer fits on one line. | The controls wrap within the viewport, and the Save default button remains fully visible. |
| 03 | Rows | Set Rows to `1`. | The first row stays visible while scrolling down. |
| 04 | Rows | Set Rows to `2`. | The first two rows stay visible with a clear separator below the second frozen row. |
| 05 | Columns | Set Columns to `1`. | The first column stays visible while scrolling horizontally. |
| 06 | Defaults | Click Save default. | The current Rows `2` and Columns `1` values are saved for `Long Table For Frozen Rows`. |
| 07 | Scroll | Drag the vertical scrollbar near the middle. | Lower rows become visible without moving the frozen rows. |
| 08 | Scroll | Drag the vertical scrollbar near the bottom. | The last rows can be reached inside the wrapper. |
| 09 | Scroll | Drag the horizontal scrollbar away from the left edge. | Frozen columns remain visible. |
| 10 | Reset | Click Reset. | The wrapper no longer needs to keep frozen rows visible. |
| 11 | Reapply | Set Rows to `1` again. | Sticky row styles are applied again cleanly. |
| 12 | Reapply | Set Columns to `2`. | The first two columns stay visible with a clear separator to the right of the second frozen column. |
| 13 | Hide row | Hover the first cell of this row and click the hide button. | The row disappears and nearby rows remain readable. |
| 14 | Hide column | Hover a header cell and click the hide button. | The column disappears while the table remains horizontally scrollable. |
| 15 | Resize column | Drag the right edge of a header cell wider. | That column widens and the table remains horizontally scrollable. |
| 16 | Resize column | Drag the same edge narrower. | That column narrows without collapsing below a usable width. |
| 17 | Resize with freeze | Keep Columns at `2` and resize the first frozen column. | The second frozen column stays aligned with the resized first column. |
| 18 | Fit | Click Fit. | Columns use readable widths, long content wraps, and frozen row and column positions remain aligned. |
| 19 | Wrap | Click Wrap after narrowing a column. | Long cell content wraps instead of showing an ellipsis. |
| 20 | Wrap with freeze | Keep Rows at `2`, Columns at `2`, and toggle Wrap. | Frozen row and column positions are recalculated and remain aligned. |
| 21 | Content | Scroll slowly through this section. | There should be no jumpy table resizing. |
| 22 | Content | Scroll quickly through this section. | The frozen row should stay anchored to the wrapper. |
| 23 | Content | Stop with this row near the top. | Text should not render on top of frozen cells. |
| 24 | Content | Stop with this row near the bottom. | The table should still be horizontally scrollable. |
| 25 | Content | Verify this row after changing Columns. | Column offsets should stay aligned. |
| 26 | Content | Verify this row after changing Rows. | Row offsets should stay aligned. |
| 27 | Content | Use the browser page scrollbar. | The table wrapper should keep its own scroll behavior. |
| 28 | Content | Use the table wrapper scrollbar. | The page layout should remain stable. |
| 29 | Page scroll | Scroll the GitHub file view so the top of this table passes under the repository controls. | Frozen rows should not appear above the table wrapper or cover GitHub file actions. |
| 29a | Restore | Open the Freeze control and click Show hidden. | Hidden rows and columns are restored. |
| 29b | Filter | Click Filter and type `rebuild`. | Only matching body rows remain visible, while the header row and any manually hidden rows keep their expected visibility. |
| 29b-1 | Regular expression filter | Enable `.*` and type `03[\\s\\S]*active`. Then enter an invalid `[` expression. | The valid expression shows matching rows case-insensitively; the invalid expression shows an error and leaves all rows visible. |
| 29c | Clear filter | Click Clear filter. | Rows hidden only by filtering are restored. |
| 29d | Copy as | With a filter or hidden column applied, click Copy as and choose Markdown, CSV, or TSV. | Clipboard output includes the visible header and visible rows only, in the selected format. |
| 29d-1 | Sort | Click the Area column sort button three times. | Rows sort ascending, then descending, then return to their original Markdown order; hidden and filtered rows retain their state. |
| 29e | Reset table view | Reapply Rows `2`, Columns `2`, hide one row and one column, click Fit, resize a column, type a filter, then click Reset table view. | Freeze, filter, hidden rows and columns, wrapping, fitted widths, and resized widths are all cleared for this table. |
| 29f | Focus mode | Apply a filter, hide a column, resize a column, and set Rows `2` / Columns `2`, then click Expand. | The selected table fills the browser window, retains all current table view settings, and shows “Focus mode — Press Esc to return” above the controls. |
| 29g | Close Focus mode | Press Escape, reopen Focus mode, then click Close. | Each action restores the GitHub file view and the table keeps the state applied before expansion. |
| 30 | Content | Scroll to this row with Rows set to `2`. | Two rows should still be visible. |
| 31 | Content | Scroll to the final row below. | All body rows should be reachable. |
| 32 | Reload | Reload the page and return to this table. | Rows `2` and Columns `1` are applied automatically from the heading default. |
| 33 | Final | Confirm the bottom of the table is visible. | No content should be clipped below the wrapper. |

## Normal-Width Control Table

| Item | Result |
| --- | --- |
| Small table | Should remain compact |
| Two columns | Should not look broken |

## Multiple Tables Back To Back

| First | Table | Here |
| --- | --- | --- |
| A | B | C |

| Second | Table | Here |
| --- | --- | --- |
| 1 | 2 | 3 |
