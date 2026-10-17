import { describe, expect, it } from "vitest";
import {
  clickButton,
  FREEZE_RULE_SETTINGS_STORAGE_KEY,
  flushPromises,
  getButton,
  getTable,
  installFakeChromeStorage,
  openFreezeControls,
  renderMarkdownTables,
  STICKY_CELL_DATA_ATTRIBUTE,
  STICKY_LEFT_PROPERTY,
  STICKY_TOP_PROPERTY,
  setFreezeInput,
  useTableFixture,
} from "../test/table-fixture";
import { wrapTable } from "./enhancer";

useTableFixture();

describe("saved heading freeze defaults", () => {
  it("applies a saved heading freeze rule as the initial value", async () => {
    installFakeChromeStorage({
      [FREEZE_RULE_SETTINGS_STORAGE_KEY]: {
        version: 2,
        repositoryRules: {
          "owner/repo": {
            "Release Matrix": { rows: 1, columns: 1 },
          },
        },
      },
    });
    renderMarkdownTables(`
      <h2>Release Matrix</h2>
      <table>
        <tbody>
          <tr><td>one</td><td>two</td></tr>
          <tr><td>three</td><td>four</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    await flushPromises();

    expect(table.rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[0]?.cells[0]?.style.getPropertyValue(STICKY_TOP_PROPERTY)).toBe("0px");
    expect(table.rows[0]?.cells[0]?.style.getPropertyValue(STICKY_LEFT_PROPERTY)).toBe("0px");
  });

  it("saves explicit freeze values for the preceding heading", async () => {
    const storage = installFakeChromeStorage({}, { setDelayMs: 1 });
    renderMarkdownTables(`
      <h2>Release Matrix</h2>
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
    clickButton("Save default");
    expect(getButton("Saving...").disabled).toBe(true);
    await flushPromises();

    expect(getButton("Saved").disabled).toBe(false);
    expect(storage[FREEZE_RULE_SETTINGS_STORAGE_KEY]).toEqual({
      version: 2,
      repositoryRules: {
        "owner/repo": {
          "Release Matrix": { rows: 1, columns: 1 },
        },
      },
    });

    setFreezeInput("Frozen columns", "2");

    expect(getButton("Save default").disabled).toBe(false);
  });

  it("does not apply a legacy heading-only freeze rule", async () => {
    installFakeChromeStorage({
      [FREEZE_RULE_SETTINGS_STORAGE_KEY]: {
        version: 1,
        headingRules: {
          "Release Matrix": { rows: 1, columns: 1 },
        },
      },
    });
    renderMarkdownTables(`
      <h2>Release Matrix</h2>
      <table><tbody><tr><td>one</td><td>two</td></tr></tbody></table>
    `);

    wrapTable(getTable());
    await flushPromises();

    expect(getTable().rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBeUndefined();
  });

  it("does not apply a rule saved for another repository", async () => {
    installFakeChromeStorage({
      [FREEZE_RULE_SETTINGS_STORAGE_KEY]: {
        version: 2,
        repositoryRules: {
          "another/repository": {
            "Release Matrix": { rows: 1, columns: 1 },
          },
        },
      },
    });
    renderMarkdownTables(`
      <h2>Release Matrix</h2>
      <table><tbody><tr><td>one</td><td>two</td></tr></tbody></table>
    `);

    wrapTable(getTable());
    await flushPromises();

    expect(getTable().rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBeUndefined();
  });

  it("does not show the save default control without a preceding heading", () => {
    renderMarkdownTables(`
      <table>
        <tbody>
          <tr><td>one</td><td>two</td></tr>
        </tbody>
      </table>
    `);
    const table = getTable();

    wrapTable(table);
    openFreezeControls();

    expect(
      Array.from(document.querySelectorAll<HTMLButtonElement>("button")).some(
        (button) => button.textContent === "Save default",
      ),
    ).toBe(false);
  });
});
