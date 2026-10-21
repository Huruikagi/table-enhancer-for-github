import { act } from "preact/test-utils";
import { describe, expect, it } from "vitest";
import {
  clickButton,
  flushPromises,
  getButton,
  getFreezeInput,
  getInput,
  getTable,
  installFakeClipboard,
  openFreezeControls,
  renderMarkdownTables,
  STICKY_CELL_DATA_ATTRIBUTE,
  STICKY_LEFT_PROPERTY,
  STICKY_TOP_PROPERTY,
  STICKY_Z_INDEX_PROPERTY,
  setFilterInput,
  setFreezeInput,
  useTableFixture,
} from "../test/table-fixture";
import { TABLE_CONTROLS_TAG, TABLE_WRAPPER_CLASS, wrapTable } from "./enhancer";

useTableFixture();

describe("table toolbar interactions", () => {
  it("adds controls that apply row and column freeze settings", () => {
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
    setFreezeInput("Frozen rows", "1");
    setFreezeInput("Frozen columns", "1");

    expect(table.rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBe("true");
    expect(
      table.closest<HTMLElement>(`.${TABLE_WRAPPER_CLASS}`)?.dataset.githubTableEnhancerFrozenRows,
    ).toBe("true");
    expect(table.rows[0]?.cells[0]?.style.getPropertyValue(STICKY_TOP_PROPERTY)).toBe("0px");
    expect(table.rows[0]?.cells[0]?.style.getPropertyValue(STICKY_LEFT_PROPERTY)).toBe("0px");
    expect(table.rows[0]?.cells[0]?.style.getPropertyValue(STICKY_Z_INDEX_PROPERTY)).toBe("4");
    expect(table.rows[0]?.cells[1]?.style.getPropertyValue(STICKY_Z_INDEX_PROPERTY)).toBe("3");
    expect(table.rows[1]?.cells[0]?.style.getPropertyValue(STICKY_Z_INDEX_PROPERTY)).toBe("2");
    expect(table.rows[1]?.cells[1]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBeUndefined();
  });

  it("orders icon controls by task and gives them accessible names and tooltips", () => {
    renderMarkdownTables("<table><tbody><tr><td>one</td></tr></tbody></table>");

    wrapTable(getTable());

    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(`${TABLE_CONTROLS_TAG} > button`),
    );
    expect(buttons.map((button) => button.ariaLabel || button.textContent)).toEqual([
      "Freeze",
      "Filter",
      "Copy as",
      "Select rows",
      "Fit",
      "Wrap",
      "Reset table view",
      "Expand",
    ]);

    for (const label of [
      "Freeze",
      "Filter",
      "Copy as",
      "Select rows",
      "Fit",
      "Wrap",
      "Reset table view",
      "Expand",
    ]) {
      const button = getButton(label);
      expect(button.title).not.toBe("");
      expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("selects the rows value when the freeze panel opens and advances through the freeze inputs", () => {
    renderMarkdownTables(`
      <h2>Release Matrix</h2>
      <table>
        <tbody>
          <tr><td>one</td><td>two</td></tr>
          <tr><td>three</td><td>four</td></tr>
          <tr><td>five</td><td>six</td></tr>
          <tr><td>seven</td><td>eight</td></tr>
          <tr><td>nine</td><td>ten</td></tr>
          <tr><td>eleven</td><td>twelve</td></tr>
        </tbody>
      </table>
    `);

    wrapTable(getTable());
    openFreezeControls();

    const rowsInput = getFreezeInput("Frozen rows");
    const columnsInput = getFreezeInput("Frozen columns");

    expect(document.activeElement).toBe(rowsInput);
    expect(rowsInput.selectionStart).toBe(0);
    expect(rowsInput.selectionEnd).toBe(rowsInput.value.length);
    expect(rowsInput.max).toBe("5");
    expect(columnsInput.max).toBe("2");

    setFreezeInput("Frozen rows", "1");

    expect(document.activeElement).toBe(columnsInput);

    setFreezeInput("Frozen columns", "1");

    expect(document.activeElement).toBe(getButton("Save default"));
  });

  it("expands a table into Focus mode and closes it without replacing the table", () => {
    renderMarkdownTables(`
      <table>
        <tbody><tr><td>wide value</td></tr></tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    const wrapper = table.closest<HTMLElement>(`.${TABLE_WRAPPER_CLASS}`);
    const controls = wrapper?.querySelector<HTMLElement>(TABLE_CONTROLS_TAG);
    if (controls) {
      controls.getBoundingClientRect = () =>
        ({ height: 48 }) as ReturnType<HTMLElement["getBoundingClientRect"]>;
    }

    clickButton("Expand");

    expect(wrapper?.dataset.githubTableEnhancerFocusMode).toBe("true");
    expect(document.body.classList.contains("github-table-enhancer-focus-mode-open")).toBe(true);
    expect(getButton("Close").ariaPressed).toBe("true");
    expect(wrapper?.querySelector(".github-table-enhancer-focus-mode-status")?.textContent).toBe(
      "Focus modePressEscto return",
    );
    expect(getButton("Close").title).toBe("Close Focus mode (Esc)");
    expect(wrapper?.querySelector("table")).toBe(table);
    expect(wrapper?.style.getPropertyValue("--gte-focus-mode-controls-height")).toBe("48px");

    clickButton("Close");

    expect(wrapper?.dataset.githubTableEnhancerFocusMode).toBeUndefined();
    expect(document.body.classList.contains("github-table-enhancer-focus-mode-open")).toBe(false);
    expect(getButton("Expand").ariaPressed).toBe("false");
    expect(wrapper?.querySelector(".github-table-enhancer-focus-mode-status")).toBeNull();
    expect(wrapper?.querySelector("table")).toBe(table);
    expect(wrapper?.style.getPropertyValue("--gte-focus-mode-controls-height")).toBe("");
  });

  it("closes Focus mode with Escape and returns focus to Expand", () => {
    renderMarkdownTables(`
      <table>
        <tbody><tr><td>wide value</td></tr></tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    clickButton("Expand");

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    });

    expect(
      table.closest<HTMLElement>(`.${TABLE_WRAPPER_CLASS}`)?.dataset.githubTableEnhancerFocusMode,
    ).toBeUndefined();
    expect(document.activeElement).toBe(getButton("Expand"));
  });

  it("closes the freeze panel with Escape from a freeze input", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>one</td><td>two</td></tr>
          <tr><td>three</td><td>four</td></tr>
        </tbody>
      </table>
    `);

    wrapTable(getTable());
    openFreezeControls();

    const freezeButton = getButton("Freeze");
    const rowsInput = getFreezeInput("Frozen rows");

    act(() => {
      rowsInput.focus();
      rowsInput.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    });

    expect(document.querySelector("input[aria-label='Frozen rows']")).toBeNull();
    expect(freezeButton.ariaExpanded).toBe("false");
    expect(document.activeElement).toBe(freezeButton);
  });

  it("closes an open control panel when clicking outside it", () => {
    renderMarkdownTables(`
      <table><tbody><tr><td>one</td><td>two</td></tr></tbody></table>
    `);

    wrapTable(getTable());
    openFreezeControls();

    act(() => {
      document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });

    expect(document.querySelector("input[aria-label='Frozen rows']")).toBeNull();
    expect(getButton("Freeze").ariaExpanded).toBe("false");
  });

  it("shows a row filter input from the Filter control", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>Runtime</td><td>Status</td></tr>
          <tr><td>Node.js</td><td>Ready</td></tr>
        </tbody>
      </table>
    `);

    wrapTable(getTable());

    expect(document.querySelector("input[aria-label='Filter rows']")).toBeNull();

    clickButton("Filter");

    const input = getInput("Filter rows");
    expect(input.placeholder).toBe("Filter rows...");
  });

  it("focuses the filter input when the filter panel opens", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>Runtime</td><td>Status</td></tr>
          <tr><td>Node.js</td><td>Ready</td></tr>
        </tbody>
      </table>
    `);

    wrapTable(getTable());
    clickButton("Filter");

    expect(document.activeElement).toBe(getInput("Filter rows"));
  });

  it("closes the filter panel with Escape from the filter input", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>Runtime</td><td>Status</td></tr>
          <tr><td>Node.js</td><td>Ready</td></tr>
        </tbody>
      </table>
    `);

    wrapTable(getTable());
    clickButton("Filter");

    const filterButton = getButton("Filter");
    const filterInput = getInput("Filter rows");

    act(() => {
      filterInput.focus();
      filterInput.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    });

    expect(document.querySelector("input[aria-label='Filter rows']")).toBeNull();
    expect(filterButton.ariaExpanded).toBe("false");
    expect(document.activeElement).toBe(filterButton);
  });

  it("keeps the freeze and filter panels mutually exclusive", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>Runtime</td><td>Status</td></tr>
          <tr><td>Node.js</td><td>Ready</td></tr>
        </tbody>
      </table>
    `);

    wrapTable(getTable());
    openFreezeControls();
    expect(getFreezeInput("Frozen rows")).toBeInstanceOf(HTMLInputElement);

    clickButton("Filter");
    expect(document.querySelector("input[aria-label='Frozen rows']")).toBeNull();
    expect(getInput("Filter rows")).toBeInstanceOf(HTMLInputElement);

    clickButton("Freeze");
    expect(document.querySelector("input[aria-label='Filter rows']")).toBeNull();
    expect(getFreezeInput("Frozen rows")).toBeInstanceOf(HTMLInputElement);
  });

  it("keeps the freeze, filter, and copy panels mutually exclusive", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>Runtime</td><td>Status</td></tr>
          <tr><td>Node.js</td><td>Ready</td></tr>
        </tbody>
      </table>
    `);

    wrapTable(getTable());
    openFreezeControls();
    expect(getFreezeInput("Frozen rows")).toBeInstanceOf(HTMLInputElement);

    clickButton("Copy as");
    expect(document.querySelector("input[aria-label='Frozen rows']")).toBeNull();
    expect(getButton("Markdown")).toBeInstanceOf(HTMLButtonElement);

    clickButton("Filter");
    expect(
      Array.from(document.querySelectorAll<HTMLButtonElement>("button")).some(
        (button) => button.textContent === "Markdown",
      ),
    ).toBe(false);
    expect(getInput("Filter rows")).toBeInstanceOf(HTMLInputElement);
  });

  it("focuses the first copy action and closes the popup with Escape", () => {
    renderMarkdownTables(`
      <table><tbody><tr><td>Runtime</td><td>Status</td></tr></tbody></table>
    `);

    wrapTable(getTable());
    clickButton("Copy as");
    const markdownButton = getButton("Markdown");

    expect(document.activeElement).toBe(markdownButton);
    act(() => {
      markdownButton.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    });

    expect(
      Array.from(document.querySelectorAll<HTMLButtonElement>("button")).some(
        (button) => button.textContent === "Markdown",
      ),
    ).toBe(false);
    expect(document.activeElement).toBe(getButton("Copy as"));
  });

  it("copies the current visible table view to the clipboard", async () => {
    const clipboard = installFakeClipboard();
    renderMarkdownTables(`
      <table>
        <thead><tr><th>Runtime</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Node.js</td><td>Ready</td></tr>
          <tr><td>Ruby</td><td>Blocked</td></tr>
        </tbody>
      </table>
    `);

    wrapTable(getTable());
    clickButton("Hide column 2");
    clickButton("Filter");
    setFilterInput("node");
    clickButton("Copy as");
    clickButton("CSV");
    await flushPromises();

    expect(clipboard.writeText).toHaveBeenCalledWith("Runtime\nNode.js");
    expect(getButton("Copied CSV")).toBeInstanceOf(HTMLButtonElement);
  });
});
