import { act } from "preact/test-utils";
import { describe, expect, it, vi } from "vitest";
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
import {
  readEffectiveFreezeDefault,
  readGlobalFreezeDefault,
  readHeadingFreezeRule,
  removeHeadingFreezeRule,
  saveGlobalFreezeDefault,
  saveHeadingFreezeRule,
} from "./freeze-rule-storage";
import { mountManagedTable } from "./lifecycle";
import type { FreezeOptions } from "./state";

useTableFixture();

describe("saved heading freeze defaults", () => {
  it("ignores a late initial heading read once removal starts", async () => {
    renderMarkdownTables("<table><tbody><tr><td>one</td></tr></tbody></table>");
    let finishInitial!: (value: FreezeOptions) => void;
    let finishRemoval!: (value: FreezeOptions) => void;
    act(() => {
      const runtime = mountManagedTable(getTable(), {
        headingText: "Matrix",
        defaultValuesPromise: new Promise((resolve) => {
          finishInitial = resolve;
        }),
        onRemoveDefault: () =>
          new Promise((resolve) => {
            finishRemoval = resolve;
          }),
      });
      getTable().before(runtime.controls);
    });
    openFreezeControls();
    clickButton("Use global default");
    finishInitial({ rows: 1, columns: 1 });
    await flushPromises();
    finishRemoval({ rows: 0, columns: 0 });
    await flushPromises();
    expect(getTable().rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBeUndefined();
  });
  it("keeps the override and current view when removal cannot be saved", async () => {
    installFakeChromeStorage({
      githubTableEnhancerGlobalFreeze: { rows: 1, columns: 0 },
      [FREEZE_RULE_SETTINGS_STORAGE_KEY]: {
        version: 2,
        repositoryRules: {
          "owner/repo": { Matrix: { rows: 0, columns: 0 } },
        },
      },
    });
    renderMarkdownTables("<h2>Matrix</h2><table><tbody><tr><td>one</td></tr></tbody></table>");
    wrapTable(getTable());
    await flushPromises();
    vi.spyOn(chrome.storage.local, "set").mockRejectedValueOnce(new Error("Write failed"));
    openFreezeControls();
    clickButton("Use global default");
    await flushPromises();
    expect(getButton("Failed")).toBeDefined();
    expect(getTable().rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBeUndefined();
    expect(await readEffectiveFreezeDefault("owner/repo", "Matrix")).toEqual({
      rows: 0,
      columns: 0,
    });
  });

  it("does not overwrite edits made while heading removal is pending", async () => {
    installFakeChromeStorage(
      { githubTableEnhancerGlobalFreeze: { rows: 1, columns: 0 } },
      { setDelayMs: 1 },
    );
    renderMarkdownTables("<h2>Matrix</h2><table><tbody><tr><td>one</td></tr></tbody></table>");
    wrapTable(getTable());
    await flushPromises();
    openFreezeControls();
    clickButton("Use global default");
    setFreezeInput("Frozen rows", "0");
    await flushPromises();
    expect(getTable().rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBeUndefined();
  });
  it("inherits global defaults without a heading and clamps them to table size", async () => {
    installFakeChromeStorage({ githubTableEnhancerGlobalFreeze: { rows: 5, columns: 5 } });
    renderMarkdownTables("<table><tbody><tr><td>one</td></tr></tbody></table>");
    wrapTable(getTable());
    await flushPromises();
    openFreezeControls();
    expect(document.querySelector<HTMLInputElement>('[aria-label="Frozen rows"]')?.value).toBe("1");
    expect(document.querySelector<HTMLInputElement>('[aria-label="Frozen columns"]')?.value).toBe(
      "1",
    );
  });

  it("keeps explicit zero overrides and removes only the selected heading", async () => {
    const storage = installFakeChromeStorage({
      githubTableEnhancerGlobalFreeze: { rows: 1, columns: 1 },
      [FREEZE_RULE_SETTINGS_STORAGE_KEY]: {
        version: 2,
        repositoryRules: {
          "owner/repo": { Matrix: { rows: 0, columns: 0 }, Other: { rows: 2, columns: 0 } },
          "other/repo": { Matrix: { rows: 2, columns: 2 } },
        },
      },
    });
    expect(await readEffectiveFreezeDefault("owner/repo", "Matrix")).toEqual({
      rows: 0,
      columns: 0,
    });
    expect(await removeHeadingFreezeRule("owner/repo", "Matrix")).toEqual({ rows: 1, columns: 1 });
    expect(await readEffectiveFreezeDefault("owner/repo", "Matrix")).toEqual({
      rows: 1,
      columns: 1,
    });
    expect(await readEffectiveFreezeDefault("owner/repo", "Other")).toEqual({
      rows: 2,
      columns: 0,
    });
    expect(await readEffectiveFreezeDefault("other/repo", "Matrix")).toEqual({
      rows: 2,
      columns: 2,
    });
    await saveGlobalFreezeDefault({ rows: 0, columns: 2 });
    expect(storage.githubTableEnhancerGlobalFreeze).toEqual({ rows: 0, columns: 2 });
    expect(await readEffectiveFreezeDefault("owner/repo", "Other")).toEqual({
      rows: 2,
      columns: 0,
    });
  });

  it("uses zero for malformed global settings and rejects invalid writes", async () => {
    installFakeChromeStorage({ githubTableEnhancerGlobalFreeze: { rows: -1, columns: 6 } });
    expect(await readGlobalFreezeDefault()).toEqual({ rows: 0, columns: 0 });
    await expect(saveGlobalFreezeDefault({ rows: 1.5, columns: 0 })).rejects.toThrow();
  });

  it("applies the global default immediately after removing a heading override", async () => {
    installFakeChromeStorage({
      githubTableEnhancerGlobalFreeze: { rows: 1, columns: 0 },
      [FREEZE_RULE_SETTINGS_STORAGE_KEY]: {
        version: 2,
        repositoryRules: {
          "owner/repo": { Matrix: { rows: 0, columns: 0 } },
        },
      },
    });
    renderMarkdownTables("<h2>Matrix</h2><table><tbody><tr><td>one</td></tr></tbody></table>");
    wrapTable(getTable());
    await flushPromises();
    openFreezeControls();
    clickButton("Use global default");
    await flushPromises();
    expect(getTable().rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBe("true");
    expect(getButton("Global default applied")).toBeDefined();
  });
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
    installFakeChromeStorage({}, { setDelayMs: 1 });
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
    expect(await readHeadingFreezeRule("owner/repo", "Release Matrix")).toEqual({
      rows: 1,
      columns: 1,
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

it("preserves concurrent saves and removals without resurrecting legacy rules", async () => {
  installFakeChromeStorage(
    {
      [FREEZE_RULE_SETTINGS_STORAGE_KEY]: {
        version: 2,
        repositoryRules: {
          "owner/repo": { A: { rows: 1, columns: 1 }, C: { rows: 1, columns: 0 } },
        },
      },
    },
    { setDelayMs: 1 },
  );
  await Promise.all([
    saveHeadingFreezeRule("owner/repo", "B", { rows: 0, columns: 1 }),
    saveHeadingFreezeRule("other/repo", "B", { rows: 1, columns: 0 }),
    removeHeadingFreezeRule("owner/repo", "A"),
  ]);
  expect(await readHeadingFreezeRule("owner/repo", "A")).toBeNull();
  expect(await readHeadingFreezeRule("owner/repo", "B")).toEqual({ rows: 0, columns: 1 });
  expect(await readHeadingFreezeRule("other/repo", "B")).toEqual({ rows: 1, columns: 0 });
  expect(await readHeadingFreezeRule("owner/repo", "C")).toEqual({ rows: 1, columns: 0 });
});
