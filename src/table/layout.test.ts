import { act } from "preact/test-utils";
import { describe, expect, it, vi } from "vitest";
import {
  clickButton,
  createRect,
  FILTERED_ROW_DATA_ATTRIBUTE,
  getButton,
  getFreezeInput,
  getInput,
  getTable,
  HIDDEN_COLUMN_DATA_ATTRIBUTE,
  HIDDEN_ROW_DATA_ATTRIBUTE,
  hideRow,
  openFreezeControls,
  renderMarkdownTables,
  STICKY_CELL_DATA_ATTRIBUTE,
  STICKY_LEFT_PROPERTY,
  setFilterInput,
  setFreezeInput,
  useTableFixture,
} from "../test/table-fixture";
import { TABLE_COLUMN_RESIZE_HANDLE_CLASS, TABLE_HIDE_BUTTON_CLASS, wrapTable } from "./enhancer";

useTableFixture();

describe("table layout and visibility interactions", () => {
  it("toggles wrapped column rendering from the table controls", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>one very long value</td><td>two</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);

    const wrapButton = getButton("Wrap");
    expect(wrapButton.ariaPressed).toBe("false");
    expect(table.dataset.githubTableEnhancerWrappedColumns).toBeUndefined();

    clickButton("Wrap");

    expect(wrapButton.ariaPressed).toBe("true");
    expect(table.dataset.githubTableEnhancerWrappedColumns).toBe("true");

    clickButton("Wrap");

    expect(wrapButton.ariaPressed).toBe("false");
    expect(table.dataset.githubTableEnhancerWrappedColumns).toBeUndefined();
  });

  it("fits columns to readable widths and enables wrapping", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>Short</td><td>Very long release note text that should be capped by fit instead of forcing a giant table column</td></tr>
          <tr><td>OK</td><td>Another long value for the same column</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    clickButton("Fit");

    const columns = table.querySelectorAll("col");
    expect(table.dataset.githubTableEnhancerResizedColumns).toBe("true");
    expect(table.dataset.githubTableEnhancerWrappedColumns).toBe("true");
    expect(getButton("Wrap").ariaPressed).toBe("true");
    expect(columns[0]?.style.width).toBe("96px");
    expect(columns[1]?.style.width).toBe("320px");
    expect(table.style.width).toBe("416px");

    clickButton("Reset table view");

    expect(getButton("Wrap").ariaPressed).toBe("false");
    expect(table.dataset.githubTableEnhancerResizedColumns).toBeUndefined();
    expect(table.dataset.githubTableEnhancerWrappedColumns).toBeUndefined();
    expect(table.style.width).toBe("");
    expect(columns[0]?.style.width).toBe("");
    expect(columns[1]?.style.width).toBe("");
  });

  it("keeps fit column widths stable when Fit is clicked repeatedly", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>Runtime</td><td>Release notes</td></tr>
          <tr><td>Node.js</td><td>Long text that still fits below the cap</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();
    const intrinsicWidths = [124, 188];

    wrapTable(table);

    for (const row of Array.from(table.rows)) {
      for (const [columnIndex, cell] of Array.from(row.cells).entries()) {
        const getMeasuredWidth = (): number => {
          const column = table.querySelectorAll<HTMLTableColElement>("col")[columnIndex];
          const appliedWidth = Number.parseFloat(column?.style.width ?? "");

          if (
            table.dataset.githubTableEnhancerResizedColumns === "true" &&
            Number.isFinite(appliedWidth)
          ) {
            return appliedWidth + 8;
          }

          return intrinsicWidths[columnIndex] ?? 96;
        };

        Object.defineProperty(cell, "scrollWidth", {
          configurable: true,
          get: getMeasuredWidth,
        });
        vi.spyOn(cell, "getBoundingClientRect").mockImplementation(() =>
          createRect(getMeasuredWidth()),
        );
      }
    }

    clickButton("Fit");

    const columns = table.querySelectorAll("col");
    expect(columns[0]?.style.width).toBe("124px");
    expect(columns[1]?.style.width).toBe("188px");

    clickButton("Fit");

    expect(columns[0]?.style.width).toBe("124px");
    expect(columns[1]?.style.width).toBe("188px");
    expect(table.style.width).toBe("312px");
  });

  it("selects rows to hide and keeps column hover controls", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>one</td><td>two</td></tr>
          <tr><td>three</td><td>four</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    hideRow(2);
    clickButton("Hide column 2");

    expect(table.querySelectorAll(`.${TABLE_HIDE_BUTTON_CLASS}`)).toHaveLength(2);
    expect(table.rows[1]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[0]?.cells[1]?.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[1]?.cells[1]?.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE]).toBe("true");
  });

  it("sorts body rows in ascending, descending, and original order", () => {
    renderMarkdownTables(`
      <table>
        <thead><tr><th>Name</th><th>Count</th></tr></thead>
        <tbody>
          <tr><td>item 10</td><td>10</td></tr>
          <tr><td>item 2</td><td>2</td></tr>
          <tr><td>item 1</td><td>1</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    clickButton("Sort by column 1");
    expect(
      Array.from(table.tBodies[0]?.rows ?? [], (row) =>
        row.cells[0]?.textContent?.replace("×", ""),
      ),
    ).toEqual(["item 1", "item 2", "item 10"]);
    expect(table.tHead?.rows[0]?.cells[0]?.getAttribute("aria-sort")).toBe("ascending");

    clickButton("Sort by column 1");
    expect(
      Array.from(table.tBodies[0]?.rows ?? [], (row) =>
        row.cells[0]?.textContent?.replace("×", ""),
      ),
    ).toEqual(["item 10", "item 2", "item 1"]);

    clickButton("Sort by column 1");
    expect(
      Array.from(table.tBodies[0]?.rows ?? [], (row) =>
        row.cells[0]?.textContent?.replace("×", ""),
      ),
    ).toEqual(["item 10", "item 2", "item 1"]);
    expect(table.tHead?.rows[0]?.cells[0]?.getAttribute("aria-sort")).toBe("none");
  });

  it("keeps a hidden row associated with the same row after sorting", () => {
    renderMarkdownTables(`
      <table>
        <thead><tr><th>Name</th></tr></thead>
        <tbody><tr><td>Zulu</td></tr><tr><td>Alpha</td></tr></tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    hideRow(3);
    clickButton("Sort by column 1");

    expect(table.tBodies[0]?.rows[0]?.cells[0]?.textContent).toContain("Alpha");
    expect(table.tBodies[0]?.rows[0]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBe("true");
    expect(table.tBodies[0]?.rows[1]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBeUndefined();
  });

  it("adds drag handles that resize columns and refresh frozen column offsets", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>one</td><td>two</td></tr>
          <tr><td>three</td><td>four</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    openFreezeControls();
    setFreezeInput("Frozen columns", "2");

    const handle = table.querySelector<HTMLElement>(`.${TABLE_COLUMN_RESIZE_HANDLE_CLASS}`);
    expect(table.querySelectorAll(`.${TABLE_COLUMN_RESIZE_HANDLE_CLASS}`)).toHaveLength(2);

    act(() => {
      handle?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 100 }));
      window.dispatchEvent(new MouseEvent("pointermove", { clientX: 132 }));
      window.dispatchEvent(new MouseEvent("pointerup", { clientX: 132 }));
    });

    const columns = table.querySelectorAll("col");
    expect(table.dataset.githubTableEnhancerResizedColumns).toBe("true");
    expect(table.style.width).toBe("128px");
    expect(columns[0]?.style.width).toBe("80px");
    expect(columns[1]?.style.width).toBe("48px");
    expect(table.rows[0]?.cells[1]?.style.getPropertyValue(STICKY_LEFT_PROPERTY)).toBe("80px");

    clickButton("Hide column 2");

    expect(columns[1]?.style.display).toBe("none");
    expect(table.style.width).toBe("80px");
  });

  it("restores hidden rows and columns from the control panel", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>one</td><td>two</td></tr>
          <tr><td>three</td><td>four</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    hideRow(2);
    clickButton("Hide column 2");
    openFreezeControls();
    clickButton("Show hidden");

    expect(table.rows[1]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[0]?.cells[1]?.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[1]?.cells[1]?.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE]).toBeUndefined();
  });

  it("resets all per-table view changes from the table controls", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>one long value</td><td>two</td></tr>
          <tr><td>three</td><td>four</td></tr>
          <tr><td>five</td><td>six</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    openFreezeControls();
    setFreezeInput("Frozen rows", "1");
    setFreezeInput("Frozen columns", "1");
    hideRow(2);
    clickButton("Hide column 2");
    clickButton("Wrap");
    clickButton("Filter");
    setFilterInput("three");
    clickButton("Sort by column 1");

    const handle = table.querySelector<HTMLElement>(`.${TABLE_COLUMN_RESIZE_HANDLE_CLASS}`);
    act(() => {
      handle?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 100 }));
      window.dispatchEvent(new MouseEvent("pointermove", { clientX: 132 }));
      window.dispatchEvent(new MouseEvent("pointerup", { clientX: 132 }));
    });

    expect(table.rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBe("true");
    expect(
      Array.from(table.rows).find((row) => row.dataset[HIDDEN_ROW_DATA_ATTRIBUTE] === "true"),
    ).toBeDefined();
    expect(table.dataset.githubTableEnhancerWrappedColumns).toBe("true");
    expect(table.dataset.githubTableEnhancerResizedColumns).toBe("true");
    expect(
      Array.from(table.rows).some((row) => row.dataset[FILTERED_ROW_DATA_ATTRIBUTE] === "true"),
    ).toBe(true);
    expect(getInput("Filter rows").value).toBe("three");

    clickButton("Reset table view");

    expect(getInput("Filter rows").value).toBe("");
    clickButton("Freeze");

    expect(getFreezeInput("Frozen rows").value).toBe("0");
    expect(getFreezeInput("Frozen columns").value).toBe("0");
    expect(table.rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[1]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[2]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[0]?.cells[1]?.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.dataset.githubTableEnhancerWrappedColumns).toBeUndefined();
    expect(table.dataset.githubTableEnhancerResizedColumns).toBeUndefined();
    expect(table.style.width).toBe("");
    expect(table.querySelector<HTMLTableColElement>("col")?.style.width).toBe("");
    expect(table.rows[1]?.cells[0]?.textContent).toContain("three");
    expect(table.rows[0]?.cells[0]?.getAttribute("aria-sort")).toBe("none");
  });
});
