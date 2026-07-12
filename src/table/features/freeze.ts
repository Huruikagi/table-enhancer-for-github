import {
  FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE,
  FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE,
  FROZEN_ROWS_DATA_ATTRIBUTE,
  STICKY_CELL_DATA_ATTRIBUTE,
  STICKY_CELL_SELECTOR,
  STICKY_LEFT_PROPERTY,
  STICKY_TOP_PROPERTY,
  STICKY_Z_INDEX_PROPERTY,
  TABLE_WRAPPER_CLASS,
} from "../constants";
import type { FreezeOptions } from "../state";
import { clampInteger } from "../utils";
import { getStickyColumnWidth } from "./resize";

type StickyCellLayout = {
  cell: HTMLTableCellElement;
  isFrozenRowBoundary: boolean;
  isFrozenColumnBoundary: boolean;
  top: number | null;
  left: number | null;
  zIndex: number;
};

function resetTableFreeze(table: HTMLTableElement): void {
  const stickyCells = table.querySelectorAll<HTMLElement>(STICKY_CELL_SELECTOR);

  for (const cell of stickyCells) {
    delete cell.dataset[STICKY_CELL_DATA_ATTRIBUTE];
    delete cell.dataset[FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE];
    delete cell.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE];
    cell.style.removeProperty(STICKY_TOP_PROPERTY);
    cell.style.removeProperty(STICKY_LEFT_PROPERTY);
    cell.style.removeProperty(STICKY_Z_INDEX_PROPERTY);
  }
}

function setFrozenRowsState(table: HTMLTableElement, frozenRows: number): void {
  const wrapper = table.closest<HTMLElement>(`.${TABLE_WRAPPER_CLASS}`);

  if (!wrapper) {
    return;
  }

  if (frozenRows > 0) {
    wrapper.dataset[FROZEN_ROWS_DATA_ATTRIBUTE] = "true";
  } else {
    delete wrapper.dataset[FROZEN_ROWS_DATA_ATTRIBUTE];
  }
}

function getNormalizedFreezeOptions(
  table: HTMLTableElement,
  options: FreezeOptions,
): FreezeOptions {
  const rows = Array.from(table.rows);

  return {
    rows: clampInteger(options.rows, 0, rows.length),
    columns: clampInteger(options.columns, 0, rows[0]?.cells.length ?? 0),
  };
}

function getStickyZIndex(isFrozenRow: boolean, isFrozenColumn: boolean): number {
  if (isFrozenRow && isFrozenColumn) {
    return 4;
  }

  if (isFrozenRow) {
    return 3;
  }

  return 2;
}

function getStickyCellLayouts(table: HTMLTableElement, options: FreezeOptions): StickyCellLayout[] {
  const rows = Array.from(table.rows);
  const layouts: StickyCellLayout[] = [];
  let top = 0;

  rows.forEach((row, rowIndex) => {
    const isFrozenRow = rowIndex < options.rows;
    const isFrozenRowBoundary = rowIndex === options.rows - 1;
    let left = 0;

    Array.from(row.cells).forEach((cell, columnIndex) => {
      const isFrozenColumn = columnIndex < options.columns;
      const isFrozenColumnBoundary = columnIndex === options.columns - 1;

      if (!isFrozenRow && !isFrozenColumn) {
        return;
      }

      layouts.push({
        cell,
        isFrozenRowBoundary,
        isFrozenColumnBoundary,
        top: isFrozenRow ? top : null,
        left: isFrozenColumn ? left : null,
        zIndex: getStickyZIndex(isFrozenRow, isFrozenColumn),
      });

      if (isFrozenColumn) {
        left += getStickyColumnWidth(table, cell, columnIndex);
      }
    });

    if (isFrozenRow) {
      top += row.getBoundingClientRect().height;
    }
  });

  return layouts;
}

function applyStickyCellLayout({
  cell,
  isFrozenColumnBoundary,
  isFrozenRowBoundary,
  top,
  left,
  zIndex,
}: StickyCellLayout): void {
  cell.dataset[STICKY_CELL_DATA_ATTRIBUTE] = "true";
  cell.style.setProperty(STICKY_Z_INDEX_PROPERTY, String(zIndex));

  if (isFrozenRowBoundary) {
    cell.dataset[FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE] = "true";
  }

  if (isFrozenColumnBoundary) {
    cell.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE] = "true";
  }

  if (top !== null) {
    cell.style.setProperty(STICKY_TOP_PROPERTY, `${top}px`);
  }

  if (left !== null) {
    cell.style.setProperty(STICKY_LEFT_PROPERTY, `${left}px`);
  }
}

export function applyTableFreeze(table: HTMLTableElement, options: FreezeOptions): void {
  resetTableFreeze(table);

  const normalizedOptions = getNormalizedFreezeOptions(table, options);
  setFrozenRowsState(table, normalizedOptions.rows);

  if (normalizedOptions.rows === 0 && normalizedOptions.columns === 0) {
    return;
  }

  for (const layout of getStickyCellLayouts(table, normalizedOptions)) {
    applyStickyCellLayout(layout);
  }
}
