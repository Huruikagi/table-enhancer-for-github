import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clickButton,
  getTable,
  renderMarkdownTables,
  setFilterInput,
  useTableFixture,
} from "../test/table-fixture";
import { wrapTable } from "./enhancer";
import { getVisibleTableData } from "./features/copy";
import { HOVER_DATA_ATTRIBUTE } from "./features/hover";
import { destroyManagedTable } from "./lifecycle";

useTableFixture();
afterEach(() => vi.restoreAllMocks());

function setup(): HTMLTableElement {
  renderMarkdownTables(`<table><thead><tr><th>Name</th><th>Status</th><th>Note</th></tr></thead>
    <tbody><tr><td>Alpha</td><td><a href="#ready"><code>Ready</code></a></td><td>First</td></tr>
    <tr><td>Beta</td><td>Pending</td><td>Second</td></tr></tbody></table>`);
  const table = getTable();
  wrapTable(table);
  return table;
}

function hover(target: Element, options: { pointerType?: string; buttons?: number } = {}): void {
  const event = new MouseEvent("pointermove", {
    bubbles: true,
    clientX: 20,
    clientY: 30,
    buttons: options.buttons ?? 0,
  });
  Object.defineProperty(event, "pointerType", { value: options.pointerType ?? "mouse" });
  target.dispatchEvent(event);
}

describe("table pointer highlights", () => {
  it("follows cell descendants across rows and columns without changing copied text", () => {
    const table = setup();
    const before = getVisibleTableData(table);
    hover(table.querySelector("code") as Element);
    expect(table.rows[1].cells[1].dataset[HOVER_DATA_ATTRIBUTE]).toBe("cell");
    expect(table.rows[1].cells[0].dataset[HOVER_DATA_ATTRIBUTE]).toBe("axis");
    expect(table.rows[2].cells[1].dataset[HOVER_DATA_ATTRIBUTE]).toBe("axis");
    expect(table.rows[0].cells[1].dataset[HOVER_DATA_ATTRIBUTE]).toBe("axis");
    expect(table.rows[2].cells[2].dataset[HOVER_DATA_ATTRIBUTE]).toBeUndefined();
    expect(getVisibleTableData(table)).toEqual(before);
    hover(table.rows[0].cells[2]);
    expect(table.rows[0].cells[2].dataset[HOVER_DATA_ATTRIBUTE]).toBe("cell");
    expect(table.rows[1].cells[1].dataset[HOVER_DATA_ATTRIBUTE]).toBeUndefined();
    table.dispatchEvent(new Event("pointerleave"));
    expect(table.querySelector("[data-github-table-enhancer-hover]")).toBeNull();
  });

  it("keeps column identity when earlier columns and rows are hidden", () => {
    const table = setup();
    clickButton("Hide column 1");
    clickButton("Filter");
    setFilterInput("Alpha");
    hover(table.rows[1].cells[1]);
    expect(table.rows[0].cells[1].dataset[HOVER_DATA_ATTRIBUTE]).toBe("axis");
    expect(table.rows[1].cells[0].dataset[HOVER_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[2].cells[1].dataset[HOVER_DATA_ATTRIBUTE]).toBeUndefined();
  });

  it("clears feedback for touch, dragging, cancellation, and window blur", () => {
    const table = setup();
    const cell = table.rows[1].cells[1];
    hover(cell);
    hover(cell, { pointerType: "touch" });
    expect(cell.dataset[HOVER_DATA_ATTRIBUTE]).toBeUndefined();
    hover(cell);
    hover(cell, { buttons: 1 });
    expect(cell.dataset[HOVER_DATA_ATTRIBUTE]).toBeUndefined();
    hover(cell);
    table.dispatchEvent(new Event("pointercancel"));
    expect(cell.dataset[HOVER_DATA_ATTRIBUTE]).toBeUndefined();
    hover(cell);
    window.dispatchEvent(new Event("blur"));
    expect(cell.dataset[HOVER_DATA_ATTRIBUTE]).toBeUndefined();
  });

  it("refreshes the hit target after view changes and cleans up on destroy", () => {
    const table = setup();
    let nextFrame: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      nextFrame = callback;
      return 1;
    });
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const descriptor = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: () => table.rows[2].cells[2],
    });
    try {
      hover(table.rows[1].cells[1]);
      clickButton("Wrap");
      expect(table.querySelector("[data-github-table-enhancer-hover]")).toBeNull();
      nextFrame?.(0);
      expect(table.rows[2].cells[2].dataset[HOVER_DATA_ATTRIBUTE]).toBe("cell");
      document.dispatchEvent(new Event("scroll"));
      destroyManagedTable(table);
      expect(cancel).toHaveBeenCalledWith(1);
      expect(table.querySelector("[data-github-table-enhancer-hover]")).toBeNull();
      hover(table.rows[1].cells[1]);
      expect(table.querySelector("[data-github-table-enhancer-hover]")).toBeNull();
    } finally {
      if (descriptor) Object.defineProperty(document, "elementFromPoint", descriptor);
      else Reflect.deleteProperty(document, "elementFromPoint");
    }
  });
});
