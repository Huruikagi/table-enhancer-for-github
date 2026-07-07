# Table Freeze Controls Design

This document records the initial design for per-table freeze controls.

## Scope

- Target GitHub Markdown blob pages only, matching the current extension scope.
- Target Markdown preview tables only.
- Do not target issue, pull request, discussion, file list, or repository README landing page tables.
- Do not persist values across page reloads or future visits in the initial implementation.

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

Initial values:

- Frozen rows: `0`.
- Frozen columns: `0`.

Reset returns both values to `0`.

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

Use a small Web Component for the controls UI rather than adding React.

Suggested component:

```html
<gte-table-controls></gte-table-controls>
```

Responsibilities:

- Render the collapsed settings button.
- Render the open panel with numeric inputs and reset control.
- Own only UI-local state for open/closed state and current input values.
- Dispatch a custom event when freeze values change.

Suggested event:

```ts
type FreezeOptions = {
  rows: number;
  columns: number;
};
```

```ts
new CustomEvent<FreezeOptions>("gte:freeze-change", {
  bubbles: true,
  detail: { rows, columns },
});
```

Keep table behavior outside the Web Component:

- Table discovery finds Markdown preview tables.
- Table enhancement inserts one controls element per table.
- Sticky style application listens for `gte:freeze-change`.
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

## Initial Limitations

- `rowspan` and `colspan` are best effort and not part of the initial guarantee.
- Value persistence with `chrome.storage` is out of scope.
- Per-repository or per-path default settings are out of scope.
- Right frozen columns are out of scope.
