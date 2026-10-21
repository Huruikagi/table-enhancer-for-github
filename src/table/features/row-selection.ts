import { translate } from "../../i18n";
import { getOriginalRowIndex, isHeaderRow, isVisibleColumnCell, isVisibleRow } from "../row-dom";
import type { TableViewState } from "../state";

export const ROW_SELECTION_CLASS = "github-table-enhancer-row-selection";

function firstVisibleCell(row: HTMLTableRowElement): HTMLTableCellElement | undefined {
  return Array.from(row.cells).find(isVisibleColumnCell);
}

export function getSelectableRows(table: HTMLTableElement): number[] {
  return Array.from(table.rows)
    .filter((row) => !isHeaderRow(table, row) && isVisibleRow(row) && firstVisibleCell(row))
    .map(getOriginalRowIndex);
}

export function applyRowSelection(
  table: HTMLTableElement,
  selection: TableViewState["rowSelection"],
): void {
  if (!selection) {
    for (const input of table.querySelectorAll(`.${ROW_SELECTION_CLASS}`)) input.remove();
    return;
  }
  const header = table.tHead?.rows[0] ?? table.rows[0];
  const eligible = new Set(selection.rows);
  const selected = new Set(selection.selected);
  for (const row of Array.from(table.rows)) {
    const index = getOriginalRowIndex(row);
    const isHeader = row === header;
    if (!isHeader && !eligible.has(index)) continue;
    const cell = firstVisibleCell(row);
    if (!cell) continue;
    let input = cell.querySelector<HTMLInputElement>(`.${ROW_SELECTION_CLASS}`);
    if (!input) {
      input = document.createElement("input");
      input.type = "checkbox";
      input.className = ROW_SELECTION_CLASS;
      input.dataset.rowSelectionIndex = isHeader ? "all" : String(index);
      input.ariaLabel = isHeader ? translate("selectAllRows") : translate("selectRow", [index + 1]);
      input.title = input.ariaLabel;
      cell.prepend(input);
    }
    input.checked = isHeader
      ? selection.selected.length === selection.rows.length && selection.rows.length > 0
      : selected.has(index);
    input.indeterminate =
      isHeader &&
      selection.selected.length > 0 &&
      selection.selected.length < selection.rows.length;
    input.disabled = isHeader && selection.rows.length === 0;
  }
}

export function getRowSelectionClick(
  table: HTMLTableElement,
  target: EventTarget | null,
): number | "all" | null {
  if (
    !(target instanceof HTMLInputElement) ||
    !target.classList.contains(ROW_SELECTION_CLASS) ||
    target.closest("table") !== table
  )
    return null;
  const value = target.dataset.rowSelectionIndex;
  if (value === "all") return "all";
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 ? index : null;
}
