import { isVisibleCell } from "../row-dom";

export const HOVER_DATA_ATTRIBUTE = "githubTableEnhancerHover";

/** Transient pointer feedback; never changes table view state, content, or column geometry. */
export function installTableHover(table: HTMLTableElement): {
  refresh: () => void;
  destroy: () => void;
} {
  let active: HTMLTableCellElement | null = null;
  let pointer: { x: number; y: number } | null = null;
  let frame: number | null = null;
  const painted = new Set<HTMLTableCellElement>();

  const clearPaint = (): void => {
    for (const cell of painted) delete cell.dataset[HOVER_DATA_ATTRIBUTE];
    painted.clear();
    active = null;
  };
  const paint = (target: EventTarget | null): void => {
    const candidate = target instanceof Element ? target.closest("th, td") : null;
    const cell =
      candidate instanceof HTMLTableCellElement &&
      candidate.closest("table") === table &&
      isVisibleCell(candidate)
        ? candidate
        : null;
    if (cell === active) return;
    clearPaint();
    if (!cell) return;
    active = cell;
    const row = cell.parentElement as HTMLTableRowElement;
    const mark = (item: HTMLTableCellElement | undefined): void => {
      if (!item || !isVisibleCell(item)) return;
      item.dataset[HOVER_DATA_ATTRIBUTE] = item === cell ? "cell" : "axis";
      painted.add(item);
    };
    for (const item of Array.from(row.cells)) mark(item);
    for (const otherRow of Array.from(table.rows)) mark(otherRow.cells[cell.cellIndex]);
  };
  const schedule = (): void => {
    if (!pointer || frame !== null) return;
    frame = window.requestAnimationFrame(() => {
      frame = null;
      if (pointer) paint(document.elementFromPoint?.(pointer.x, pointer.y) ?? null);
    });
  };
  const clear = (): void => {
    pointer = null;
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    clearPaint();
  };
  const handlePointer = (event: PointerEvent): void => {
    if (event.pointerType === "touch" || event.buttons !== 0) {
      clear();
      return;
    }
    pointer = { x: event.clientX, y: event.clientY };
    paint(event.target);
  };
  table.addEventListener("pointerover", handlePointer);
  table.addEventListener("pointermove", handlePointer);
  table.addEventListener("pointerleave", clear);
  table.addEventListener("pointercancel", clear);
  document.addEventListener("scroll", schedule, true);
  window.addEventListener("resize", schedule);
  window.addEventListener("blur", clear);

  return {
    refresh: () => {
      clearPaint();
      schedule();
    },
    destroy: () => {
      clear();
      table.removeEventListener("pointerover", handlePointer);
      table.removeEventListener("pointermove", handlePointer);
      table.removeEventListener("pointerleave", clear);
      table.removeEventListener("pointercancel", clear);
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("blur", clear);
    },
  };
}
