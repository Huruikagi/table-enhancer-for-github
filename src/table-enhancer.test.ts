import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyTableFreeze,
  applyTableVisibility,
  enhanceTables,
  findMarkdownContainer,
  findPreviousHeadingText,
  isMarkdownBlobPage,
  startTableEnhancer,
  TABLE_COLUMN_RESIZE_HANDLE_CLASS,
  TABLE_CONTROLS_TAG,
  TABLE_HIDE_BUTTON_CLASS,
  TABLE_WRAPPER_CLASS,
  wrapTable,
} from "./table-enhancer";

const STICKY_CELL_DATA_ATTRIBUTE = "githubTableEnhancerSticky";
const FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE = "githubTableEnhancerFrozenRowBoundary";
const FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE = "githubTableEnhancerFrozenColumnBoundary";
const HIDDEN_ROW_DATA_ATTRIBUTE = "githubTableEnhancerHiddenRow";
const HIDDEN_COLUMN_DATA_ATTRIBUTE = "githubTableEnhancerHiddenColumn";
const FILTERED_ROW_DATA_ATTRIBUTE = "githubTableEnhancerFilteredRow";
const STICKY_TOP_PROPERTY = "--gte-sticky-top";
const STICKY_LEFT_PROPERTY = "--gte-sticky-left";
const STICKY_Z_INDEX_PROPERTY = "--gte-sticky-z-index";
const FREEZE_RULE_SETTINGS_STORAGE_KEY = "githubTableEnhancerFreezeRuleSettings";

type FakeChromeStorage = Record<string, unknown>;

function installFakeChromeStorage(
  initialStorage: FakeChromeStorage = {},
  options: { setDelayMs?: number } = {},
): FakeChromeStorage {
  const storage = { ...initialStorage };

  (
    globalThis as typeof globalThis & {
      chrome?: unknown;
    }
  ).chrome = {
    storage: {
      local: {
        async get(key: string): Promise<Record<string, unknown>> {
          return { [key]: storage[key] };
        },
        async set(items: Record<string, unknown>): Promise<void> {
          if (options.setDelayMs !== undefined) {
            await new Promise((resolve) => setTimeout(resolve, options.setDelayMs));
          }

          Object.assign(storage, items);
        },
      },
    },
  };

  return storage;
}

function uninstallFakeChromeStorage(): void {
  delete (
    globalThis as typeof globalThis & {
      chrome?: unknown;
    }
  ).chrome;
}

async function flushPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function setPathname(pathname: string): void {
  window.history.replaceState(null, "", pathname);
}

function renderMarkdownTables(markup: string): void {
  document.body.innerHTML = `<article class="markdown-body">${markup}</article>`;
}

function getTable(selector = "table"): HTMLTableElement {
  const table = document.querySelector(selector);

  if (!(table instanceof HTMLTableElement)) {
    throw new Error(`Expected ${selector} to match a table`);
  }

  return table;
}

function openFreezeControls(): void {
  act(() => {
    document.querySelector<HTMLButtonElement>(`${TABLE_CONTROLS_TAG} button`)?.click();
  });
}

function getInput(label: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(`input[aria-label='${label}']`);

  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Expected ${label} input to be rendered`);
  }

  return input;
}

function getFreezeInput(label: string): HTMLInputElement {
  return getInput(label);
}

function setFreezeInput(label: string, value: string): void {
  const input = getFreezeInput(label);
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event("change"));
  });
}

function setFilterInput(value: string): void {
  const input = getInput("Filter rows");
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function clickButton(label: string): void {
  const button =
    document.querySelector<HTMLButtonElement>(`button[aria-label='${label}']`) ??
    Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (candidate) => candidate.textContent === label,
    );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected ${label} button to be rendered`);
  }

  act(() => {
    button.click();
  });
}

function getButton(label: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => candidate.textContent === label,
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected ${label} button to be rendered`);
  }

  return button;
}

describe("isMarkdownBlobPage", () => {
  it("matches GitHub Markdown blob paths", () => {
    expect(isMarkdownBlobPage("/owner/repo/blob/main/docs/index.md")).toBe(true);
    expect(isMarkdownBlobPage("/owner/repo/blob/feature/foo/README.MD")).toBe(true);
  });

  it("does not match non-blob or non-Markdown paths", () => {
    expect(isMarkdownBlobPage("/owner/repo/issues/1")).toBe(false);
    expect(isMarkdownBlobPage("/owner/repo/pull/1")).toBe(false);
    expect(isMarkdownBlobPage("/owner/repo/blob/main/src/index.ts")).toBe(false);
  });
});

describe("findMarkdownContainer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("prefers GitHub's Markdown body container", () => {
    document.body.innerHTML = `
      <main>
        <article class="markdown-body"></article>
      </main>
    `;

    expect(findMarkdownContainer()).toBe(document.querySelector(".markdown-body"));
  });

  it("falls back to the provided root", () => {
    const root = document.createElement("section");

    expect(findMarkdownContainer(root)).toBe(root);
  });
});

describe("findPreviousHeadingText", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("uses the nearest preceding Markdown heading text", () => {
    renderMarkdownTables(`
      <h2>First Section</h2>
      <table id="first"><tbody><tr><td>one</td></tr></tbody></table>
      <h3>  Release   Matrix  </h3>
      <p>Details</p>
      <table id="second"><tbody><tr><td>two</td></tr></tbody></table>
    `);

    expect(findPreviousHeadingText(getTable("#first"))).toBe("First Section");
    expect(findPreviousHeadingText(getTable("#second"))).toBe("Release Matrix");
  });

  it("returns null when no heading precedes the table", () => {
    renderMarkdownTables("<table><tbody><tr><td>one</td></tr></tbody></table><h2>Later</h2>");

    expect(findPreviousHeadingText(getTable())).toBeNull();
  });
});

describe("wrapTable", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    uninstallFakeChromeStorage();
  });

  afterEach(() => {
    uninstallFakeChromeStorage();
  });

  it("wraps a table in a horizontal scroll container", () => {
    renderMarkdownTables("<table><tbody><tr><td>wide value</td></tr></tbody></table>");
    const table = getTable();

    wrapTable(table);

    const wrapper = document.querySelector(`.${TABLE_WRAPPER_CLASS}`);
    expect(wrapper).toBeInstanceOf(HTMLDivElement);
    expect(wrapper?.querySelector(TABLE_CONTROLS_TAG)).toBeInstanceOf(HTMLElement);
    expect(wrapper?.querySelector("table")).toBe(table);
    expect(table?.dataset.githubTableEnhancer).toBe("true");
  });

  it("does not double-wrap an already enhanced table", () => {
    renderMarkdownTables('<table data-github-table-enhancer="true"></table>');
    const table = getTable();

    wrapTable(table);

    expect(document.querySelectorAll(`.${TABLE_WRAPPER_CLASS}`)).toHaveLength(0);
  });

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
    expect(table.rows[2]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBe("true");
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
    clickButton("Hide row 2");
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

  it("applies a saved heading freeze rule as the initial value", async () => {
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
      version: 1,
      headingRules: {
        "Release Matrix": { rows: 1, columns: 1 },
      },
    });

    setFreezeInput("Frozen columns", "2");

    expect(getButton("Save default").disabled).toBe(false);
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

  it("adds hover controls that hide rows and columns", () => {
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
    clickButton("Hide row 2");
    clickButton("Hide column 2");

    expect(table.querySelectorAll(`.${TABLE_HIDE_BUTTON_CLASS}`)).toHaveLength(4);
    expect(table.rows[1]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[0]?.cells[1]?.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[1]?.cells[1]?.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE]).toBe("true");
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
    clickButton("Hide row 2");
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
    clickButton("Hide row 2");
    clickButton("Hide column 2");
    clickButton("Wrap");
    clickButton("Filter");
    setFilterInput("three");

    const handle = table.querySelector<HTMLElement>(`.${TABLE_COLUMN_RESIZE_HANDLE_CLASS}`);
    act(() => {
      handle?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 100 }));
      window.dispatchEvent(new MouseEvent("pointermove", { clientX: 132 }));
      window.dispatchEvent(new MouseEvent("pointerup", { clientX: 132 }));
    });

    expect(table.rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[1]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBe("true");
    expect(table.dataset.githubTableEnhancerWrappedColumns).toBe("true");
    expect(table.dataset.githubTableEnhancerResizedColumns).toBe("true");
    expect(table.rows[2]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBe("true");
    expect(getInput("Filter rows").value).toBe("three");

    clickButton("Reset table view");

    expect(getFreezeInput("Frozen rows").value).toBe("0");
    expect(getFreezeInput("Frozen columns").value).toBe("0");
    expect(table.rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[1]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[2]?.dataset[FILTERED_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(getInput("Filter rows").value).toBe("");
    expect(table.rows[0]?.cells[1]?.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.dataset.githubTableEnhancerWrappedColumns).toBeUndefined();
    expect(table.dataset.githubTableEnhancerResizedColumns).toBeUndefined();
    expect(table.style.width).toBe("");
    expect(table.querySelector<HTMLTableColElement>("col")?.style.width).toBe("");
  });
});

describe("applyTableFreeze", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("clears previous sticky styles before applying new values", () => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr><td>one</td><td>two</td></tr>
          <tr><td>three</td><td>four</td></tr>
        </tbody>
      </table>
    `;
    const table = getTable();

    applyTableFreeze(table, { rows: 1, columns: 1 });
    expect(table.rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBe("true");

    applyTableFreeze(table, { rows: 0, columns: 0 });

    expect(table.rows[0]?.cells[0]?.dataset[STICKY_CELL_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[0]?.cells[0]?.dataset[FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[0]?.cells[0]?.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[0]?.cells[0]?.style.getPropertyValue(STICKY_TOP_PROPERTY)).toBe("");
    expect(table.rows[0]?.cells[0]?.style.getPropertyValue(STICKY_LEFT_PROPERTY)).toBe("");
    expect(table.rows[0]?.cells[0]?.style.getPropertyValue(STICKY_Z_INDEX_PROPERTY)).toBe("");
  });

  it("marks only the final frozen row as the row boundary", () => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr><td>one</td><td>two</td></tr>
          <tr><td>three</td><td>four</td></tr>
          <tr><td>five</td><td>six</td></tr>
        </tbody>
      </table>
    `;
    const table = getTable();

    applyTableFreeze(table, { rows: 2, columns: 1 });

    expect(table.rows[0]?.cells[0]?.dataset[FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[0]?.cells[1]?.dataset[FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[1]?.cells[0]?.dataset[FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[1]?.cells[1]?.dataset[FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[2]?.cells[0]?.dataset[FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
  });

  it("marks only the final frozen column as the column boundary", () => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr><td>one</td><td>two</td><td>three</td></tr>
          <tr><td>four</td><td>five</td><td>six</td></tr>
        </tbody>
      </table>
    `;
    const table = getTable();

    applyTableFreeze(table, { rows: 1, columns: 2 });

    expect(table.rows[0]?.cells[0]?.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[0]?.cells[1]?.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[0]?.cells[2]?.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[1]?.cells[0]?.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[1]?.cells[1]?.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[1]?.cells[2]?.dataset[FROZEN_COLUMN_BOUNDARY_DATA_ATTRIBUTE]).toBeUndefined();
  });
});

describe("applyTableVisibility", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("marks hidden rows and columns and clears previous visibility state", () => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr><td>one</td><td>two</td></tr>
          <tr><td>three</td><td>four</td></tr>
        </tbody>
      </table>
    `;
    const table = getTable();

    applyTableVisibility(table, { rows: [1], columns: [1] });
    expect(table.rows[1]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBe("true");
    expect(table.rows[0]?.cells[1]?.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE]).toBe("true");

    applyTableVisibility(table, { rows: [], columns: [] });
    expect(table.rows[1]?.dataset[HIDDEN_ROW_DATA_ATTRIBUTE]).toBeUndefined();
    expect(table.rows[0]?.cells[1]?.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE]).toBeUndefined();
  });
});

describe("enhanceTables", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    setPathname("/owner/repo/blob/main/docs/index.md");
  });

  it("enhances every table inside the Markdown container", () => {
    renderMarkdownTables(`
      <table><tbody><tr><td>one</td></tr></tbody></table>
      <table><tbody><tr><td>two</td></tr></tbody></table>
    `);
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <table><tbody><tr><td>outside</td></tr></tbody></table>
    `,
    );

    enhanceTables();

    expect(document.querySelectorAll(`.markdown-body .${TABLE_WRAPPER_CLASS}`)).toHaveLength(2);
    expect(document.body.children[1].tagName).toBe("TABLE");
  });

  it("does nothing outside Markdown blob pages", () => {
    setPathname("/owner/repo/issues/1");
    renderMarkdownTables("<table><tbody><tr><td>issue table</td></tr></tbody></table>");

    enhanceTables();

    expect(document.querySelector(`.${TABLE_WRAPPER_CLASS}`)).toBeNull();
  });

  it("does not wrap the same table twice when called repeatedly", () => {
    renderMarkdownTables("<table><tbody><tr><td>one</td></tr></tbody></table>");

    enhanceTables();
    enhanceTables();

    expect(document.querySelectorAll(`.${TABLE_WRAPPER_CLASS}`)).toHaveLength(1);
  });

  it("enhances tables added after the observer starts", async () => {
    renderMarkdownTables("");

    const observer = startTableEnhancer();
    document
      .querySelector(".markdown-body")
      ?.insertAdjacentHTML(
        "beforeend",
        "<table><tbody><tr><td>late table</td></tr></tbody></table>",
      );
    await Promise.resolve();
    observer.disconnect();

    expect(document.querySelectorAll(`.${TABLE_WRAPPER_CLASS}`)).toHaveLength(1);
  });
});
