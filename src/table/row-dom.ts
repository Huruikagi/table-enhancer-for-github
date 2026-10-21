/** Shared row identity and read-only queries over the current DOM projection. */
import {
  FILTERED_ROW_DATA_ATTRIBUTE,
  HIDDEN_COLUMN_DATA_ATTRIBUTE,
  HIDDEN_ROW_DATA_ATTRIBUTE,
  ORIGINAL_ROW_INDEX_DATA_ATTRIBUTE,
} from "./constants";

export function initializeOriginalRowIndexes(table: HTMLTableElement): void {
  for (const [rowIndex, row] of Array.from(table.rows).entries()) {
    row.dataset[ORIGINAL_ROW_INDEX_DATA_ATTRIBUTE] ??= String(rowIndex);
  }
}

export function getOriginalRowIndex(row: HTMLTableRowElement): number {
  // Unmounted tables can be inspected without writing identity attributes.
  return Number(row.dataset[ORIGINAL_ROW_INDEX_DATA_ATTRIBUTE] ?? row.rowIndex);
}

export function isHeaderRow(table: HTMLTableElement, row: HTMLTableRowElement): boolean {
  return table.tHead?.contains(row) ?? row === table.rows[0];
}

export function isVisibleRow(row: HTMLElement): boolean {
  return (
    row.dataset[HIDDEN_ROW_DATA_ATTRIBUTE] !== "true" &&
    row.dataset[FILTERED_ROW_DATA_ATTRIBUTE] !== "true"
  );
}

export function isVisibleColumnCell(cell: HTMLTableCellElement): boolean {
  return cell.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE] !== "true";
}

export function isVisibleCell(cell: HTMLTableCellElement): boolean {
  const row = cell.parentElement;
  return !!row && isVisibleRow(row) && isVisibleColumnCell(cell);
}
