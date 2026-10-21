/** Persistent column width projection, invoked by table reconciliation. */
import { RESIZED_COLUMNS_DATA_ATTRIBUTE } from "../constants";
import { getAppliedColumnWidths, measureFitTableColumnWidths } from "./column-measurement";

export function resetTableColumnResize(table: HTMLTableElement): void {
  delete table.dataset[RESIZED_COLUMNS_DATA_ATTRIBUTE];
  table.style.width = "";
  table.style.minWidth = "";

  for (const column of table.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col")) {
    column.style.width = "";
    column.style.display = "";
  }
}

function ensureColumnGroup(table: HTMLTableElement, columnCount: number): HTMLTableColElement[] {
  const existingColumnGroup = table.querySelector<HTMLTableColElement>(":scope > colgroup");
  const columnGroup = existingColumnGroup ?? document.createElement("colgroup");

  if (!existingColumnGroup) {
    table.insertBefore(columnGroup, table.firstChild);
  }

  while (columnGroup.children.length < columnCount) {
    columnGroup.appendChild(document.createElement("col"));
  }

  while (columnGroup.children.length > columnCount) {
    columnGroup.lastElementChild?.remove();
  }

  return Array.from(columnGroup.children).filter(
    (column): column is HTMLTableColElement => column instanceof HTMLTableColElement,
  );
}

function applyColumnWidths(table: HTMLTableElement, widths: readonly number[]): void {
  const columns = ensureColumnGroup(table, widths.length);
  const tableWidth = `${widths.reduce((sum, width) => sum + width, 0)}px`;

  table.dataset[RESIZED_COLUMNS_DATA_ATTRIBUTE] = "true";
  table.style.width = tableWidth;
  table.style.minWidth = tableWidth;

  widths.forEach((width, index) => {
    columns[index]?.style.setProperty("width", `${width}px`);
  });
}

export function applyTableColumnWidths(
  table: HTMLTableElement,
  widths: readonly number[] | null,
  hiddenColumns: ReadonlySet<number> = new Set(),
): void {
  if (!widths) {
    resetTableColumnResize(table);
    return;
  }

  applyColumnWidths(table, widths);
  updateResizedTableWidth(table, hiddenColumns);
}

export function fitTableColumnWidths(
  table: HTMLTableElement,
  hiddenColumns: ReadonlySet<number> = new Set(),
): void {
  applyTableColumnWidths(table, measureFitTableColumnWidths(table), hiddenColumns);
}

export function updateResizedTableWidth(
  table: HTMLTableElement,
  hiddenColumns: ReadonlySet<number>,
): void {
  if (table.dataset[RESIZED_COLUMNS_DATA_ATTRIBUTE] !== "true") {
    return;
  }

  let visibleWidth = 0;

  getAppliedColumnWidths(table).forEach((width, columnIndex) => {
    if (!hiddenColumns.has(columnIndex)) {
      visibleWidth += width;
    }
  });

  const tableWidth = `${visibleWidth}px`;
  table.style.width = tableWidth;
  table.style.minWidth = tableWidth;
}
