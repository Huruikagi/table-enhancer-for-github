import { act } from "preact/test-utils";
import { describe, expect, it } from "vitest";
import {
  clickButton,
  getButton,
  getInput,
  getTable,
  hideRow,
  renderMarkdownTables,
  setFilterInput,
  useTableFixture,
} from "../test/table-fixture";
import { HIDDEN_ROW_DATA_ATTRIBUTE } from "./constants";
import { wrapTable } from "./enhancer";
import { getVisibleTableData } from "./features/copy";
import { ROW_SELECTION_CLASS } from "./features/row-selection";
import { destroyManagedTable } from "./lifecycle";

useTableFixture();

function setup(): HTMLTableElement {
  renderMarkdownTables(`<table><thead><tr><th>Name</th><th>Status</th></tr></thead><tbody>
    <tr><td>Zulu</td><td>Ready</td></tr>
    <tr><td>Alpha</td><td>Ready</td></tr>
    <tr><td>Beta</td><td>Blocked</td></tr>
    </tbody></table>`);
  const table = getTable();
  wrapTable(table);
  return table;
}

function toggle(label: string): void {
  act(() => getInput(label).click());
}

describe("row selection", () => {
  it("starts checked, supports select all / mixed / clear all, and applies only on request", () => {
    const table = setup();
    expect(table.querySelector('[data-github-table-enhancer-hide-action="hide-row"]')).toBeNull();
    clickButton("Select rows");
    const all = getInput("Select all visible rows");
    expect(all.checked).toBe(true);
    expect(document.activeElement).toBe(all);
    toggle("Select row 2");
    expect(all.indeterminate).toBe(true);
    expect(table.rows[1].dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    toggle("Select all visible rows");
    expect(all.checked).toBe(true);
    toggle("Select all visible rows");
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(false);
    toggle("Select row 3");
    expect(all.indeterminate).toBe(true);
    expect(getVisibleTableData(table)).toHaveLength(4);
    clickButton("Show selected rows");
    expect(getVisibleTableData(table)).toEqual([
      ["Name", "Status"],
      ["Alpha", "Ready"],
    ]);
    expect(table.querySelector(`.${ROW_SELECTION_CLASS}`)).toBeNull();
    expect(document.activeElement).toBe(getButton("Select rows"));
    clickButton("Show hidden");
    expect(getVisibleTableData(table)).toHaveLength(4);
  });

  it("preserves earlier hiding and rows outside the current filter", () => {
    const table = setup();
    hideRow(2);
    clickButton("Filter");
    setFilterInput("ready");
    clickButton("Select rows");
    expect(table.querySelectorAll(`.${ROW_SELECTION_CLASS}`)).toHaveLength(2);
    toggle("Select all visible rows");
    clickButton("Show selected rows");
    clickButton("Filter");
    clickButton("Clear filter");
    expect(getVisibleTableData(table)).toEqual([
      ["Name", "Status"],
      ["Beta", "Blocked"],
    ]);
    clickButton("Show hidden");
    expect(getVisibleTableData(table)).toHaveLength(4);
  });

  it("keeps selection identity through sorting with a hidden first column and copies no controls", () => {
    const table = setup();
    clickButton("Hide column 1");
    clickButton("Select rows");
    expect(getInput("Select row 2").parentElement).toBe(table.rows[1].cells[1]);
    toggle("Select row 2");
    clickButton("Sort by column 2");
    expect(getInput("Select row 2").checked).toBe(false);
    expect(table.rows[0].cells.length).toBe(2);
    clickButton("Show selected rows");
    expect(getVisibleTableData(table)).toEqual([["Status"], ["Blocked"], ["Ready"]]);
  });

  it("cancels through Cancel, Escape, filter changes, and reset without applying drafts", () => {
    const table = setup();
    clickButton("Select rows");
    toggle("Select row 2");
    clickButton("Cancel");
    expect(getVisibleTableData(table)).toHaveLength(4);
    clickButton("Select rows");
    toggle("Select all visible rows");
    act(() => {
      getInput("Select row 2").dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(table.querySelector(`.${ROW_SELECTION_CLASS}`)).toBeNull();
    expect(document.activeElement).toBe(getButton("Select rows"));
    clickButton("Select rows");
    toggle("Select row 2");
    clickButton("Filter");
    setFilterInput("ready");
    expect(table.querySelector(`.${ROW_SELECTION_CLASS}`)).toBeNull();
    clickButton("Select rows");
    toggle("Select all visible rows");
    clickButton("Reset table view");
    expect(table.querySelector(`.${ROW_SELECTION_CLASS}`)).toBeNull();
    expect(getVisibleTableData(table)).toHaveLength(4);
  });

  it("allows an empty selection and disables applying when there are no selectable rows", () => {
    const table = setup();
    clickButton("Select rows");
    toggle("Select all visible rows");
    clickButton("Show selected rows");
    expect(getVisibleTableData(table)).toEqual([["Name", "Status"]]);
    clickButton("Select rows");
    expect(getInput("Select all visible rows").disabled).toBe(true);
    expect(getButton("Show selected rows").disabled).toBe(true);
    clickButton("Show hidden");
    expect(getVisibleTableData(table)).toHaveLength(4);
  });

  it("removes selection controls on destroy and starts clean after remount", () => {
    const table = setup();
    clickButton("Select rows");
    toggle("Select all visible rows");
    act(() => destroyManagedTable(table));
    expect(table.querySelector(`.${ROW_SELECTION_CLASS}`)).toBeNull();
    expect(getVisibleTableData(table)).toHaveLength(4);
    wrapTable(table);
    clickButton("Select rows");
    expect(table.querySelectorAll(`.${ROW_SELECTION_CLASS}`)).toHaveLength(4);
    expect(getInput("Select all visible rows").checked).toBe(true);
  });
});
