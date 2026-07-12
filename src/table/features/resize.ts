import {
  COLUMN_RESIZE_INDEX_DATA_ATTRIBUTE,
  FILTERED_ROW_DATA_ATTRIBUTE,
  HIDDEN_ROW_DATA_ATTRIBUTE,
  MIN_COLUMN_WIDTH,
  RESIZED_COLUMNS_DATA_ATTRIBUTE,
  TABLE_COLUMN_RESIZE_HANDLE_CLASS,
} from "../constants";

const FIT_COLUMN_MIN_WIDTH = 96;
const FIT_COLUMN_MAX_WIDTH = 320;
const FIT_COLUMN_TEXT_PADDING = 28;
const FIT_COLUMN_AVERAGE_CHARACTER_WIDTH = 8;

type ColumnResizeState = {
  columnIndex: number;
  pointerId: number;
  startX: number;
  startWidth: number;
  widths: number[];
};

export function resetTableColumnResizeControls(table: HTMLTableElement): void {
  for (const handle of table.querySelectorAll(`.${TABLE_COLUMN_RESIZE_HANDLE_CLASS}`)) {
    handle.remove();
  }
}

export function resetTableColumnResize(table: HTMLTableElement): void {
  delete table.dataset[RESIZED_COLUMNS_DATA_ATTRIBUTE];
  table.style.width = "";
  table.style.minWidth = "";

  for (const column of table.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col")) {
    column.style.width = "";
    column.style.display = "";
  }
}

function createColumnResizeHandle(index: number): HTMLSpanElement {
  const handle = document.createElement("span");

  handle.ariaHidden = "true";
  handle.className = TABLE_COLUMN_RESIZE_HANDLE_CLASS;
  handle.dataset[COLUMN_RESIZE_INDEX_DATA_ATTRIBUTE] = String(index);
  handle.title = `Resize column ${index + 1}`;

  return handle;
}

export function installTableColumnResizeControls(table: HTMLTableElement): void {
  resetTableColumnResizeControls(table);

  const columnControlRow = table.tHead?.rows[0] ?? table.rows[0];

  if (!columnControlRow) {
    return;
  }

  for (const [columnIndex, cell] of Array.from(columnControlRow.cells).entries()) {
    cell.appendChild(createColumnResizeHandle(columnIndex));
  }
}

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

function isVisibleRow(row: HTMLTableRowElement): boolean {
  return (
    row.dataset[HIDDEN_ROW_DATA_ATTRIBUTE] !== "true" &&
    row.dataset[FILTERED_ROW_DATA_ATTRIBUTE] !== "true"
  );
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

function getColumnWidths(table: HTMLTableElement): number[] {
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

function getColumnResizeHandle(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest<HTMLElement>(`.${TABLE_COLUMN_RESIZE_HANDLE_CLASS}`);
}

export function installColumnResizeBehavior(
  table: HTMLTableElement,
  onResize: (widths: readonly number[]) => void,
): () => void {
  let resizeState: ColumnResizeState | null = null;

  const finishResize = (): void => {
    if (!resizeState) {
      return;
    }

    resizeState = null;
    document.documentElement.style.cursor = "";
    document.documentElement.style.userSelect = "";
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!resizeState || event.pointerId !== resizeState.pointerId) {
      return;
    }

    const widths = [...resizeState.widths];
    widths[resizeState.columnIndex] = Math.max(
      resizeState.startWidth + event.clientX - resizeState.startX,
      MIN_COLUMN_WIDTH,
    );

    onResize(widths);
  };

  const handlePointerUp = (event: PointerEvent): void => {
    if (resizeState && event.pointerId === resizeState.pointerId) {
      finishResize();
    }
  };

  const handlePointerDown = (event: PointerEvent): void => {
    const handle = getColumnResizeHandle(event.target);

    if (!handle || !table.contains(handle)) {
      return;
    }

    const columnIndex = Number(handle.dataset[COLUMN_RESIZE_INDEX_DATA_ATTRIBUTE]);
    const widths = getColumnWidths(table);

    if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex >= widths.length) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    resizeState = {
      columnIndex,
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: widths[columnIndex] ?? MIN_COLUMN_WIDTH,
      widths,
    };
    document.documentElement.style.cursor = "col-resize";
    document.documentElement.style.userSelect = "none";
  };

  table.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerUp);

  return () => {
    table.removeEventListener("pointerdown", handlePointerDown);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerUp);
    finishResize();
  };
}

export function getStickyColumnWidth(
  table: HTMLTableElement,
  cell: HTMLTableCellElement,
  columnIndex: number,
): number {
  const appliedWidth = getAppliedColumnWidths(table)[columnIndex];

  if (appliedWidth !== undefined) {
    return appliedWidth;
  }

  return cell.getBoundingClientRect().width;
}
