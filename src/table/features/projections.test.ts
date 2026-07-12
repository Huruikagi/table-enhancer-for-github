import { beforeEach, describe, expect, it } from "vitest";
import { getVisibleTableData, serializeTableData } from "./copy";
import { applyTableFreeze } from "./freeze";
import { applyTableVisibility } from "./visibility";

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
