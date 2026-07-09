# Table Freeze Controls Design

This document records the initial design for per-table freeze controls.

## Scope

- Target GitHub Markdown blob pages only, matching the current extension scope.
- Target Markdown preview tables only.
- Do not target issue, pull request, discussion, file list, or repository README landing page tables.
- Persist explicit per-heading default freeze values with `chrome.storage.local`.
- Use the nearest preceding Markdown heading text as the persistence key.

## User Interface

Each enhanced Markdown table gets one compact controls element near the table.

- Show a small settings button by default.
- Open a small panel when the button is clicked.
- Keep the panel scoped to the nearest table.
- Avoid showing row and column inputs permanently above every table.

The panel contains:

- Frozen rows input.
- Frozen columns input.
- Reset button.
- Save default button when a preceding heading is available.

Initial values:

- Frozen rows: saved heading default, or `0` when no rule exists.
- Frozen columns: saved heading default, or `0` when no rule exists.

Reset returns both values to `0`.

Save default persists the current frozen rows and frozen columns for the nearest preceding heading
text. Tables without a preceding heading cannot save a default. Tables under the same heading text use
the same saved default.

## Freeze Behavior

Frozen rows:

- Treat the table as one visual row sequence.
- Freeze the first N displayed rows regardless of whether they come from `thead` or `tbody`.
- This supports use cases where the first body rows should remain visible along with, or instead of, header rows.

Frozen columns:

- Freeze the first N displayed columns from the left.
- Right-side frozen columns are out of scope for the initial implementation.

Combined row and column freezing:

- Cells that are both in frozen rows and frozen columns need the highest stacking order.
- Frozen row cells should stack above normal cells.
- Frozen column cells should stack above normal cells.
- Normal cells keep the default stacking behavior.

## Implementation Shape

Render one lightweight controls host for each enhanced table, and mount a small Preact component into
that host. The Chrome extension content script should not rely on registering Web Components or
page-world globals such as `customElements`.

Controls host:

```html
<gte-table-controls></gte-table-controls>
```

Responsibilities:

- Render the collapsed settings button.
- Render the open panel with numeric inputs and reset control.
- Own only UI-local state for open/closed state and current input values in the Preact component.
- Call the table freeze application logic directly when freeze values change.
- Load a saved heading default asynchronously and apply it only if the user has not already changed
  the current table values.

Keep table behavior separate from table discovery:

- Table discovery finds Markdown preview tables.
- Table enhancement inserts one controls host per table and mounts Preact controls into it.
- Sticky style application resets previous freeze styles before applying new values.

## Sticky Calculation Notes

Rows:

- Use the rendered table row order, such as `table.rows`.
- For each frozen row, calculate `top` as the cumulative height of the frozen rows above it.
- Apply sticky positioning to cells in each frozen row.

Columns:

- Calculate `left` as the cumulative width of frozen cells to the left.
- Apply sticky positioning to cells in each frozen column.

Stacking:

- Frozen row and frozen column intersection cells need the highest `z-index`.
- Frozen row-only cells and frozen column-only cells need separate lower layers.
- Background color should be applied to sticky cells so scrolled content does not show through.

## Heading Default Rules

Heading default rules are intentionally simple:

- Key rules by normalized heading text only.
- Apply the same rule to repeated headings and to multiple tables under the same heading.
- Store rules in `chrome.storage.local`, not synced storage.
- Save rules only when the user explicitly clicks Save default.
- Do not offer saving when no heading appears before the table.

## Initial Limitations

- `rowspan` and `colspan` are best effort and not part of the initial guarantee.
- Per-repository, per-path, and per-table default settings are out of scope.
- Right frozen columns are out of scope.
