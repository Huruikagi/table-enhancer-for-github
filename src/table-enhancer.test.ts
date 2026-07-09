import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import {
  applyTableFreeze,
  enhanceTables,
  findMarkdownContainer,
  isMarkdownBlobPage,
  startTableEnhancer,
  TABLE_CONTROLS_TAG,
  TABLE_WRAPPER_CLASS,
  wrapTable,
} from "./table-enhancer";

const STICKY_CELL_DATA_ATTRIBUTE = "githubTableEnhancerSticky";
const FROZEN_ROW_BOUNDARY_DATA_ATTRIBUTE = "githubTableEnhancerFrozenRowBoundary";
const STICKY_TOP_PROPERTY = "--gte-sticky-top";
const STICKY_LEFT_PROPERTY = "--gte-sticky-left";
const STICKY_Z_INDEX_PROPERTY = "--gte-sticky-z-index";

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

function getFreezeInput(label: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(`input[aria-label='${label}']`);

  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Expected ${label} input to be rendered`);
  }

  return input;
}

function setFreezeInput(label: string, value: string): void {
  const input = getFreezeInput(label);
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event("change"));
  });
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

describe("wrapTable", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
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
