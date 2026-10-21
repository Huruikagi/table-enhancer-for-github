import { beforeEach, describe, expect, it, vi } from "vitest";
import { measureFitTableColumnWidths } from "./column-measurement";
import { applyTableColumnWidths } from "./column-widths";
import { getVisibleTableData, serializeTableData } from "./copy";
import { applyTableFreeze } from "./freeze";
import { applyTableSort } from "./sort";
import { applyTableVisibility, getTableFilterResult } from "./visibility";

const STICKY_CELL_DATA_ATTRIBUTE = "githubTableEnhancerSticky";
const FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE = "githubTableEnhancerFrozenRowBoundary";
const FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE = "githubTableEnhancerFrozenColumnBoundary";
const HIDDEN_ROW_DATA_ATTRIBUTE = "githubTableEnhancerHiddenRow";
const HIDDEN_COLUMN_DATA_ATTRIBUTE = "githubTableEnhancerHiddenColumn";
const STICKY_TOP_PROPERTY = "--gte-sticky-top";
const STICKY_LEFT_PROPERTY = "--gte-sticky-left";
const STICKY_Z_INDEX_PROPERTY = "--gte-sticky-z-index";

function getTable(): HTMLTableElement {
  const table = document.querySelector("table");
  if (!(table instanceof HTMLTableElement)) throw new Error("Expected a table");
  return table;
}

describe("table DOM projections", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("reads filter summaries without DOM writes before mounting or after sorting", () => {
    document.body.innerHTML = `
      <table><thead><tr><th>Runtime</th></tr></thead><tbody>
        <tr><td>Node.js</td></tr><tr><td>Ruby</td></tr><tr><td>Node.js LTS</td></tr>
      </tbody></table>
    `;
    const table = getTable();
    const observer = new MutationObserver(() => undefined);
    observer.observe(table, { attributes: true, childList: true, subtree: true });
    try {
      const visibility = { rows: [1], columns: [], filterQuery: "node" };
      expect(getTableFilterResult(table, visibility)).toEqual({
        matchingRows: 2,
        totalRows: 3,
        visibleRows: 1,
      });
      expect(observer.takeRecords()).toEqual([]);

      applyTableSort(table, { column: 0, direction: "descending" });
      applyTableVisibility(table, visibility);
      observer.takeRecords();
      expect(getTableFilterResult(table, visibility)).toEqual({
        matchingRows: 2,
        totalRows: 3,
        visibleRows: 1,
      });
      expect(getVisibleTableData(table)).toEqual([["Runtime"], ["Node.js LTS"]]);
      expect(observer.takeRecords()).toEqual([]);
    } finally {
      observer.disconnect();
    }
  });

  it("restores applied widths and hidden columns after successful or failed Fit measurement", () => {
    document.body.innerHTML = `
      <table><thead><tr><th>Name</th><th>Status</th></tr></thead>
        <tbody><tr><td>Node.js</td><td>Ready</td></tr></tbody>
      </table>
    `;
    const table = getTable();
    applyTableColumnWidths(table, [180, 220], new Set([1]));
    applyTableVisibility(table, { rows: [], columns: [1] });
    const readLayout = () => ({
      resized: table.dataset.githubTableEnhancerResizedColumns,
      width: table.style.width,
      minWidth: table.style.minWidth,
      columns: Array.from(table.querySelectorAll("col"), (column) => ({
        width: column.style.width,
        display: column.style.display,
      })),
    });
    const before = readLayout();
    expect(measureFitTableColumnWidths(table)).toHaveLength(2);
    expect(readLayout()).toEqual(before);

    const measurement = vi
      .spyOn(table.rows[0].cells[0], "getBoundingClientRect")
      .mockImplementationOnce(() => {
        throw new Error("measurement failed");
      });
    try {
      expect(() => measureFitTableColumnWidths(table)).toThrow("measurement failed");
      expect(readLayout()).toEqual(before);
    } finally {
      measurement.mockRestore();
    }
  });

  it("uses applied widths and per-cell fallbacks for frozen column offsets", () => {
    document.body.innerHTML = `
      <table><colgroup><col style="width: 120px"></colgroup><tbody>
        <tr><td>one</td><td>two</td><td>three</td></tr>
        <tr><td>four</td><td>five</td><td>six</td></tr>
      </tbody></table>
    `;
    const table = getTable();
    const measurements = Array.from(table.rows, (row, index) =>
      vi
        .spyOn(row.cells[1], "getBoundingClientRect")
        .mockReturnValue({ width: 70 + index * 20 } as DOMRect),
    );
    try {
      applyTableFreeze(table, { rows: 0, columns: 3 });
      expect(table.rows[0].cells[1].style.getPropertyValue(STICKY_LEFT_PROPERTY)).toBe("120px");
      expect(table.rows[1].cells[1].style.getPropertyValue(STICKY_LEFT_PROPERTY)).toBe("120px");
      expect(table.rows[0].cells[2].style.getPropertyValue(STICKY_LEFT_PROPERTY)).toBe("190px");
      expect(table.rows[1].cells[2].style.getPropertyValue(STICKY_LEFT_PROPERTY)).toBe("210px");
    } finally {
      for (const measurement of measurements) measurement.mockRestore();
    }
  });

  it("clears previous sticky styles before applying new freeze values", () => {
    document.body.innerHTML = `
      <table><tbody>
        <tr><td>one</td><td>two</td></tr>
        <tr><td>three</td><td>four</td></tr>
      </tbody></table>
    `;
    const table = getTable();

    applyTableFreeze(table, { rows: 1, columns: 1 });
    expect(table.rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBe("true");
    applyTableFreeze(table, { rows: 0, columns: 0 });

    const cell = table.rows[0]?.cells[0];
    expect(cell?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBeUndefined();
    expect(cell?.dataset[FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
    expect(cell?.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
    expect(cell?.style.getPropertyValue(STICKY_TOP_PROPERTY)).toBe("");
    expect(cell?.style.getPropertyValue(STICKY_LEFT_PROPERTY)).toBe("");
    expect(cell?.style.getPropertyValue(STICKY_Z_INDEX_PROPERTY)).toBe("");
  });

  it("marks only the final frozen row as a boundary", () => {
    document.body.innerHTML = `
      <table><tbody>
        <tr><td>one</td><td>two</td></tr>
        <tr><td>three</td><td>four</td></tr>
        <tr><td>five</td><td>six</td></tr>
      </tbody></table>
    `;
    const table = getTable();

    applyTableFreeze(table, { rows: 2, columns: 1 });

    expect(table.rows[1]?.cells[0]?.dataset[FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[0]?.cells[0]?.dataset[FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[2]?.cells[0]?.dataset[FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
  });

  it("marks only the final frozen column as a boundary", () => {
    document.body.innerHTML = `
      <table><tbody>
        <tr><td>one</td><td>two</td><td>three</td></tr>
        <tr><td>four</td><td>five</td><td>six</td></tr>
      </tbody></table>
    `;
    const table = getTable();

    applyTableFreeze(table, { rows: 1, columns: 2 });

    expect(table.rows[0]?.cells[1]?.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[0]?.cells[0]?.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[0]?.cells[2]?.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[1]?.cells[1]?.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE]).toBe("true");
  });

  it("marks visibility state and clears its previous projection", () => {
    document.body.innerHTML = `
      <table><tbody>
        <tr><td>one</td><td>two</td></tr>
        <tr><td>three</td><td>four</td></tr>
      </tbody></table>
    `;
    const table = getTable();

    applyTableVisibility(table, { rows: [1], columns: [1] });
    expect(table.rows[1]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[0]?.cells[1]?.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE]).toBe("true");
    applyTableVisibility(table, { rows: [], columns: [] });
    expect(table.rows[1]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[0]?.cells[1]?.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE]).toBeUndefined();
  });

  it("serializes only the visible rows and columns", () => {
    document.body.innerHTML = `
      <table>
        <thead><tr><th>Runtime</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td>Node.js</td><td>Ready</td><td>Uses | pipes</td></tr>
          <tr><td>Ruby</td><td>Blocked</td><td>Needs review</td></tr>
        </tbody>
      </table>
    `;
    const table = getTable();

    applyTableVisibility(table, { rows: [], columns: [1], filterQuery: "node" });
    const visibleData = getVisibleTableData(table);

    expect(visibleData).toEqual([
      ["Runtime", "Notes"],
      ["Node.js", "Uses | pipes"],
    ]);
    expect(serializeTableData(visibleData, "markdown")).toBe(
      "| Runtime | Notes |\n| --- | --- |\n| Node.js | Uses \\| pipes |",
    );
    expect(serializeTableData(visibleData, "csv")).toBe("Runtime,Notes\nNode.js,Uses | pipes");
    expect(serializeTableData(visibleData, "tsv")).toBe("Runtime\tNotes\nNode.js\tUses | pipes");
  });
});
