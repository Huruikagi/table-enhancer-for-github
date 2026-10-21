import { act } from "preact/test-utils";
import { describe, expect, it } from "vitest";
import {
  clickButton,
  FILTERED_ROW_DATA_ATTRIBUTE,
  getButton,
  getInput,
  getTable,
  HIDDEN_ROW_DATA_ATTRIBUTE,
  hideRow,
  openFreezeControls,
  renderMarkdownTables,
  STICKY_CELL_DATA_ATTRIBUTE,
  STICKY_TOP_PROPERTY,
  setFilterInput,
  setFreezeInput,
  useTableFixture,
} from "../test/table-fixture";
import { wrapTable } from "./enhancer";

useTableFixture();

describe("table row filtering", () => {
  it("filters body rows by matching row text", () => {
    renderMarkdownTables(`
      <table>
        <thead><tr><th>Runtime</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Node.js</td><td>Ready</td></tr>
          <tr><td>Ruby</td><td>Blocked</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    clickButton("Filter");
    setFilterInput("node");

    expect(table.tHead?.rows[0]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.tBodies[0]?.rows[0]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.tBodies[0]?.rows[1]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBe("true");
  });

  it("filters rows case-insensitively", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>Runtime</td></tr>
          <tr><td>Chrome Stable</td></tr>
          <tr><td>Firefox Nightly</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    clickButton("Filter");
    setFilterInput("chrome stable");

    expect(table.rows[1]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(
      Array.from(table.rows).some((row) => row.dataset[FILTERED_ROW_DATA_ATTRIBUTE] === "true"),
    ).toBe(true);
  });

  it("toggles case-insensitive regular expression filtering", () => {
    renderMarkdownTables(`
      <table>
        <thead><tr><th>Runtime</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Node.js</td><td>Ready</td></tr>
          <tr><td>Ruby</td><td>Blocked</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    clickButton("Filter");
    const regularExpressionButton = getButton("Use regular expression");
    expect(regularExpressionButton.ariaPressed).toBe("false");

    clickButton("Use regular expression");
    setFilterInput("node\\.js.*ready$");

    expect(regularExpressionButton.ariaPressed).toBe("true");
    expect(table.tBodies[0]?.rows[0]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.tBodies[0]?.rows[1]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBe("true");
  });

  it("shows invalid regular expressions without filtering rows", () => {
    renderMarkdownTables(`
      <table>
        <thead><tr><th>Runtime</th></tr></thead>
        <tbody><tr><td>Node.js</td></tr><tr><td>Ruby</td></tr></tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    clickButton("Filter");
    clickButton("Use regular expression");
    setFilterInput("[");

    expect(getInput("Filter rows").ariaInvalid).toBe("true");
    expect(document.querySelector("[role='alert']")?.textContent).toBe(
      "Invalid regular expression",
    );
    expect(
      Array.from(table.tBodies[0]?.rows ?? []).every(
        (row) => row.dataset[FILTERED_ROW_DATA_ATTRIBUTE] === undefined,
      ),
    ).toBe(true);
  });

  it("clears row filtering for empty input and Clear filter", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>Runtime</td></tr>
          <tr><td>Node.js</td></tr>
          <tr><td>Ruby</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    clickButton("Filter");
    setFilterInput("node");
    expect(table.rows[2]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBe("true");

    setFilterInput("   ");
    expect(table.rows[2]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBeUndefined();

    setFilterInput("node");
    clickButton("Clear filter");
    expect(table.rows[2]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBeUndefined();
  });

  it("explains empty filter results and distinguishes manually hidden matches", () => {
    renderMarkdownTables(`
      <table>
        <thead><tr><th>Runtime</th></tr></thead>
        <tbody><tr><td>Node.js</td></tr><tr><td>Ruby</td></tr></tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    clickButton("Filter");
    setFilterInput("missing");

    expect(document.querySelector(".github-table-enhancer-filter-summary")?.textContent).toBe(
      "0 of 2 rows",
    );
    expect(document.querySelector("[role='status']")?.textContent).toContain(
      "No rows match this filter.",
    );

    setFilterInput("node");
    hideRow(2);

    clickButton("Filter");

    expect(document.querySelector(".github-table-enhancer-filter-summary")?.textContent).toBe(
      "0 shown · 1 matches · 2 total",
    );
    expect(document.querySelector("[role='status']")?.textContent).toContain(
      "1 matching row is hidden.",
    );
    expect(document.querySelector("[role='status']")?.textContent).toContain("Show hidden");
  });

  it("restores hidden filter matches from the empty state", () => {
    renderMarkdownTables(`
      <table>
        <thead><tr><th>Runtime</th></tr></thead>
        <tbody><tr><td>Node.js</td></tr><tr><td>Ruby</td></tr></tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    clickButton("Filter");
    setFilterInput("node");
    hideRow(2);
    const emptyState = document.querySelector<HTMLElement>(
      ".github-table-enhancer-filter-empty-state",
    );

    act(() => {
      emptyState
        ?.querySelector<HTMLButtonElement>("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(table.rows[1]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(document.querySelector(".github-table-enhancer-filter-empty-state")).toBeNull();
  });

  it("keeps the first row visible as a header when the table has no thead", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>Runtime</td><td>Status</td></tr>
          <tr><td>Node.js</td><td>Ready</td></tr>
          <tr><td>Ruby</td><td>Blocked</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    clickButton("Filter");
    setFilterInput("node");

    expect(table.rows[0]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[1]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[2]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBe("true");
  });

  it("keeps manually hidden rows hidden even when they match the filter", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>Runtime</td></tr>
          <tr><td>Node.js</td></tr>
          <tr><td>Ruby</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    hideRow(2);
    clickButton("Filter");
    setFilterInput("node");

    expect(table.rows[1]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[1]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[2]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBe("true");
  });

  it("refreshes frozen cell layout after filter changes", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>Runtime</td><td>Status</td></tr>
          <tr><td>Node.js</td><td>Ready</td></tr>
          <tr><td>Ruby</td><td>Blocked</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    openFreezeControls();
    setFreezeInput("Frozen rows", "1");
    expect(table.rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBe("true");

    clickButton("Filter");
    setFilterInput("node");

    expect(table.rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[0]?.cells[0]?.style.getPropertyValue(STICKY_TOP_PROPERTY)).toBe("0px");
    expect(table.rows[2]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBe("true");
  });
});
