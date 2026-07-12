import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getVisibleTableData, serializeTableData } from "./table/copy";
import {
  applyTableFreeze,
  applyTableVisibility,
  enhanceTables,
  findMarkdownContainer,
  findPreviousHeadingText,
  getRepositoryKey,
  isMarkdownBlobPage,
  startTableEnhancer,
  TABLE_COLUMN_RESIZE_HANDLE_CLASS,
  TABLE_CONTROLS_TAG,
  TABLE_HIDE_BUTTON_CLASS,
  TABLE_WRAPPER_CLASS,
  wrapTable,
} from "./table/enhancer";

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

function installFakeClipboard(): { writeText: ReturnType<typeof vi.fn> } {
  const clipboard = {
    writeText: vi.fn(async () => {}),
  };

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: clipboard,
  });

  return clipboard;
}

function uninstallFakeClipboard(): void {
  Reflect.deleteProperty(navigator, "clipboard");
}

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
  const button =
    document.querySelector<HTMLButtonElement>(`button[aria-label='${label}']`) ??
    Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (candidate) => candidate.textContent === label,
    );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected ${label} button to be rendered`);
  }

  return button;
}

function createRect(width: number): DOMRect {
  return {
    bottom: 0,
    height: 0,
    left: 0,
    right: width,
    top: 0,
    width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
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

describe("getRepositoryKey", () => {
  it("returns a case-insensitive owner/repository key for blob pages", () => {
    expect(getRepositoryKey("/Owner/Repository/blob/main/docs/index.md")).toBe("owner/repository");
  });

  it("returns null outside a repository blob path", () => {
    expect(getRepositoryKey("/owner/repo/issues/1")).toBeNull();
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
    setPathname("/owner/repo/blob/main/docs/index.md");
    uninstallFakeChromeStorage();
    uninstallFakeClipboard();
  });

  afterEach(() => {
    uninstallFakeChromeStorage();
    uninstallFakeClipboard();
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
      "Fit",
      "Wrap",
      "Reset table view",
      "Expand",
    ]);

    for (const label of ["Filter", "Fit", "Wrap", "Reset table view", "Expand"]) {
      const button = getButton(label);
      expect(button.title).not.toBe("");
      expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("focuses the rows input when the freeze panel opens", () => {
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

    expect(document.activeElement).toBe(getFreezeInput("Frozen rows"));
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
    clickButton("Hide row 3");
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

describe("copy table data", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("serializes only visible table rows and columns", () => {
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
