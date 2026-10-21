/** Width reads and temporary intrinsic measurement; no persistent layout changes. */
import { MIN_COLUMN_WIDTH, RESIZED_COLUMNS_DATA_ATTRIBUTE } from "../constants";
import { isVisibleRow } from "../row-dom";

const FIT_COLUMN_MIN_WIDTH = 96;
const FIT_COLUMN_MAX_WIDTH = 320;
const FIT_COLUMN_TEXT_PADDING = 28;
const FIT_COLUMN_AVERAGE_CHARACTER_WIDTH = 8;

function getTableColumnCount(table: HTMLTableElement): number {
  return Math.max(...Array.from(table.rows, (row) => row.cells.length), 0);
}

function clampColumnWidth(width: number): number {
  return Math.min(Math.max(width, FIT_COLUMN_MIN_WIDTH), FIT_COLUMN_MAX_WIDTH);
}

function getCellPreferredWidth(cell: HTMLTableCellElement): number {
  const measuredWidth = Math.max(cell.scrollWidth, cell.getBoundingClientRect().width);

  if (measuredWidth > 0) {
    return measuredWidth;
  }

  return (
    (cell.textContent ?? "").trim().length * FIT_COLUMN_AVERAGE_CHARACTER_WIDTH +
    FIT_COLUMN_TEXT_PADDING
  );
}

function measureWithIntrinsicColumnWidths<T>(table: HTMLTableElement, measure: () => T): T {
  const hadResizedColumns = table.dataset[RESIZED_COLUMNS_DATA_ATTRIBUTE] === "true";
  const tableWidth = table.style.width;
  const tableMinWidth = table.style.minWidth;
  const columnWidths = Array.from(
    table.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col"),
    (column) => column.style.width,
  );

  delete table.dataset[RESIZED_COLUMNS_DATA_ATTRIBUTE];
  table.style.width = "";
  table.style.minWidth = "";

  for (const column of table.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col")) {
    column.style.width = "";
  }

  try {
    return measure();
  } finally {
    if (hadResizedColumns) {
      table.dataset[RESIZED_COLUMNS_DATA_ATTRIBUTE] = "true";
    }

    table.style.width = tableWidth;
    table.style.minWidth = tableMinWidth;

    Array.from(table.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col")).forEach(
      (column, index) => {
        column.style.width = columnWidths[index] ?? "";
      },
    );
  }
}

export function getAppliedColumnWidths(table: HTMLTableElement): number[] {
  const columns = Array.from(
    table.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col"),
  );

  return columns.map((column) => {
    const width = Number.parseFloat(column.style.width);
    return Number.isFinite(width) ? width : MIN_COLUMN_WIDTH;
  });
}

export function getColumnWidths(table: HTMLTableElement): number[] {
  const columnCount = getTableColumnCount(table);
  const appliedWidths = getAppliedColumnWidths(table);

  if (appliedWidths.length === columnCount) {
    return appliedWidths;
  }

  const firstCompleteRow =
    Array.from(table.rows).find((row) => row.cells.length === columnCount) ?? table.rows[0];

  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const cell = firstCompleteRow?.cells[columnIndex];
    return Math.max(cell?.getBoundingClientRect().width ?? MIN_COLUMN_WIDTH, MIN_COLUMN_WIDTH);
  });
}

export function measureFitTableColumnWidths(table: HTMLTableElement): readonly number[] {
  const columnCount = getTableColumnCount(table);

  if (columnCount === 0) {
    return [];
  }

  return measureWithIntrinsicColumnWidths(table, () =>
    Array.from({ length: columnCount }, (_, columnIndex) => {
      const preferredWidth = Array.from(table.rows).reduce((currentWidth, row) => {
        if (!isVisibleRow(row)) {
          return currentWidth;
        }

        const cell = row.cells[columnIndex];

        if (!cell) {
          return currentWidth;
        }

        return Math.max(currentWidth, getCellPreferredWidth(cell));
      }, MIN_COLUMN_WIDTH);

      return clampColumnWidth(preferredWidth);
    }),
  );
}

export function getStickyColumnWidth(
  table: HTMLTableElement,
  cell: HTMLTableCellElement,
  columnIndex: number,
  appliedWidths: readonly number[] = getAppliedColumnWidths(table),
): number {
  const appliedWidth = appliedWidths[columnIndex];

  if (appliedWidth !== undefined) {
    return appliedWidth;
  }

  return cell.getBoundingClientRect().width;
}
