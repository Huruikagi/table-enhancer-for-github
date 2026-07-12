import {
  ORIGINAL_ROW_INDEX_DATA_ATTRIBUTE,
  SORT_COLUMN_INDEX_DATA_ATTRIBUTE,
  TABLE_SORT_BUTTON_CLASS,
} from "../constants";
import type { TableSort } from "../state";

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function isHeaderRow(table: HTMLTableElement, row: HTMLTableRowElement): boolean {
  return table.tHead?.contains(row) ?? row === table.rows[0];
}

export function initializeOriginalRowIndexes(table: HTMLTableElement): void {
  for (const [rowIndex, row] of Array.from(table.rows).entries()) {
    row.dataset[ORIGINAL_ROW_INDEX_DATA_ATTRIBUTE] ??= String(rowIndex);
  }
}

export function getOriginalRowIndex(row: HTMLTableRowElement): number {
  return Number(row.dataset[ORIGINAL_ROW_INDEX_DATA_ATTRIBUTE]);
}

function getSortableRows(table: HTMLTableElement): HTMLTableRowElement[] {
  return Array.from(table.rows).filter((row) => !isHeaderRow(table, row));
}

function parseNumber(value: string): number | null {
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized || !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)%?$/.test(normalized)) {
    return null;
  }
  const number = Number(normalized.replace(/%$/, ""));
  return Number.isFinite(number) ? number : null;
}

function parseDate(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[ T].*)?$/.test(normalized)) {
    return null;
  }
  const time = Date.parse(normalized);
  return Number.isNaN(time) ? null : time;
}

function compareCellText(left: string, right: string): number {
  const leftNumber = parseNumber(left);
  const rightNumber = parseNumber(right);
  if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber;

  const leftDate = parseDate(left);
  const rightDate = parseDate(right);
  if (leftDate !== null && rightDate !== null) return leftDate - rightDate;

  return collator.compare(left.trim(), right.trim());
}

function getCellSortText(cell: HTMLTableCellElement | undefined): string {
  if (!cell) return "";
  const clone = cell.cloneNode(true) as HTMLTableCellElement;
  for (const button of clone.querySelectorAll("button")) button.remove();
  return clone.textContent ?? "";
}

export function applyTableSort(table: HTMLTableElement, sort: TableSort): void {
  initializeOriginalRowIndexes(table);
  const rows = getSortableRows(table);
  rows.sort((left, right) => {
    if (!sort) return getOriginalRowIndex(left) - getOriginalRowIndex(right);
    const comparison = compareCellText(
      getCellSortText(left.cells[sort.column]),
      getCellSortText(right.cells[sort.column]),
    );
    const directed = sort.direction === "ascending" ? comparison : -comparison;
    return directed || getOriginalRowIndex(left) - getOriginalRowIndex(right);
  });

  for (const row of rows) row.parentElement?.appendChild(row);

  const headerRow = table.tHead?.rows[0] ?? table.rows[0];
  for (const [columnIndex, cell] of Array.from(headerRow?.cells ?? []).entries()) {
    cell.setAttribute("aria-sort", sort?.column === columnIndex ? sort.direction : "none");
  }
}

function createSortButton(columnIndex: number): HTMLButtonElement {
  const button = document.createElement("button");
  button.ariaLabel = `Sort by column ${columnIndex + 1}`;
  button.className = TABLE_SORT_BUTTON_CLASS;
  button.dataset[SORT_COLUMN_INDEX_DATA_ATTRIBUTE] = String(columnIndex);
  button.title = `${button.ariaLabel} (ascending, descending, original order)`;
  button.type = "button";
  button.textContent = "⇅";
  return button;
}

export function installTableSortControls(table: HTMLTableElement): void {
  resetTableSortControls(table);
  initializeOriginalRowIndexes(table);
  const headerRow = table.tHead?.rows[0] ?? table.rows[0];
  for (const [columnIndex, cell] of Array.from(headerRow?.cells ?? []).entries()) {
    cell.setAttribute("aria-sort", "none");
    cell.appendChild(createSortButton(columnIndex));
  }
}

export function resetTableSortControls(table: HTMLTableElement): void {
  for (const button of table.querySelectorAll(`.${TABLE_SORT_BUTTON_CLASS}`)) button.remove();
  for (const cell of table.querySelectorAll("[aria-sort]")) cell.removeAttribute("aria-sort");
}

export function getSortColumnClick(
  table: HTMLTableElement,
  target: EventTarget | null,
): number | null {
  if (!(target instanceof Element)) return null;
  const button = target.closest<HTMLButtonElement>(`.${TABLE_SORT_BUTTON_CLASS}`);
  if (!button || !table.contains(button)) return null;
  const column = Number(button.dataset[SORT_COLUMN_INDEX_DATA_ATTRIBUTE]);
  return Number.isInteger(column) ? column : null;
}

export function getNextTableSort(current: TableSort, column: number): TableSort {
  if (current?.column !== column) return { column, direction: "ascending" };
  if (current.direction === "ascending") return { column, direction: "descending" };
  return null;
}
