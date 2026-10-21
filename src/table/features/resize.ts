/** Resize handles and pointer lifecycle; width changes are dispatched to the controller. */
import { translate } from "../../i18n";
import {
  COLUMN_RESIZE_INDEX_DATA_ATTRIBUTE,
  MIN_COLUMN_WIDTH,
  TABLE_COLUMN_RESIZE_HANDLE_CLASS,
} from "../constants";
import { getColumnWidths } from "./column-measurement";

// Preserve the previous entry points while callers use the focused modules.
export {
  getAppliedColumnWidths,
  getStickyColumnWidth,
  measureFitTableColumnWidths,
} from "./column-measurement";
export {
  applyTableColumnWidths,
  fitTableColumnWidths,
  resetTableColumnResize,
  updateResizedTableWidth,
} from "./column-widths";

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

function createColumnResizeHandle(index: number): HTMLSpanElement {
  const handle = document.createElement("span");

  handle.ariaHidden = "true";
  handle.className = TABLE_COLUMN_RESIZE_HANDLE_CLASS;
  handle.dataset[COLUMN_RESIZE_INDEX_DATA_ATTRIBUTE] = String(index);
  handle.title = translate("resizeColumn", [index + 1]);

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
