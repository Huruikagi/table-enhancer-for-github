# E2E Table Fixture

Use this page to manually verify the extension on an actual GitHub Markdown blob page in Chrome.

## Expected Behavior

- Each table should remain readable inside the GitHub Markdown preview.
- Wide tables should scroll horizontally instead of forcing every column to become narrow.
- Normal-width tables should still look like regular GitHub Markdown tables.
- Each enhanced table should show a compact Freeze control above the table.
- Opening the Freeze control should show inputs for frozen rows and frozen columns.
- Setting frozen rows should keep the first N displayed rows visible while scrolling vertically.
- The last frozen row should show a clear bottom separator while the table scrolls vertically.
- When frozen rows are enabled, long tables may scroll vertically inside the table wrapper.
- Setting frozen columns should keep the first N left columns fully visible while scrolling horizontally, including after dragging the table scrollbar away from the left edge.
- Reset should return both freeze values to `0` and remove sticky row and column behavior.

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
| 02 | Setup | Open the Freeze control. | Rows and Columns inputs are visible. |
| 03 | Rows | Set Rows to `1`. | The first row stays visible while scrolling down. |
| 04 | Rows | Set Rows to `2`. | The first two rows stay visible with a clear separator below the second frozen row. |
| 05 | Columns | Set Columns to `1`. | The first column stays visible while scrolling horizontally. |
| 06 | Combined | Keep Rows at `2` and Columns at `1`. | The top-left frozen cells stay above the rest of the table. |
| 07 | Scroll | Drag the vertical scrollbar near the middle. | Lower rows become visible without moving the frozen rows. |
| 08 | Scroll | Drag the vertical scrollbar near the bottom. | The last rows can be reached inside the wrapper. |
| 09 | Scroll | Drag the horizontal scrollbar away from the left edge. | Frozen columns remain visible. |
| 10 | Reset | Click Reset. | The wrapper no longer needs to keep frozen rows visible. |
| 11 | Reapply | Set Rows to `1` again. | Sticky row styles are applied again cleanly. |
| 12 | Reapply | Set Columns to `2`. | The first two columns stay visible. |
| 13 | Content | Confirm this row remains readable. | Body rows should not overlap the frozen row. |
| 14 | Content | Confirm alternating nearby rows remain readable. | Sticky backgrounds should cover scrolled content. |
| 15 | Content | Scroll slowly through this section. | There should be no jumpy table resizing. |
| 16 | Content | Scroll quickly through this section. | The frozen row should stay anchored to the wrapper. |
| 17 | Content | Stop with this row near the top. | Text should not render on top of frozen cells. |
| 18 | Content | Stop with this row near the bottom. | The table should still be horizontally scrollable. |
| 19 | Content | Verify this row after changing Columns. | Column offsets should stay aligned. |
| 20 | Content | Verify this row after changing Rows. | Row offsets should stay aligned. |
| 21 | Content | Use the browser page scrollbar. | The table wrapper should keep its own scroll behavior. |
| 22 | Content | Use the table wrapper scrollbar. | The page layout should remain stable. |
| 23 | Content | Scroll to this row with Rows set to `1`. | The header row should still be visible. |
| 24 | Content | Scroll to this row with Rows set to `2`. | Two rows should still be visible. |
| 25 | Content | Scroll to the final row below. | All body rows should be reachable. |
| 26 | Final | Confirm the bottom of the table is visible. | No content should be clipped below the wrapper. |

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
