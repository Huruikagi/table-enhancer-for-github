import { beforeEach, describe, expect, it } from "vitest";
import {
  enhanceTables,
  findMarkdownContainer,
  isMarkdownBlobPage,
  TABLE_WRAPPER_CLASS,
  wrapTable,
} from "./table-enhancer";

function setPathname(pathname: string): void {
  window.history.replaceState(null, "", pathname);
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
    document.body.innerHTML = `
      <article class="markdown-body">
        <table><tbody><tr><td>wide value</td></tr></tbody></table>
      </article>
    `;
    const table = document.querySelector("table");

    expect(table).toBeInstanceOf(HTMLTableElement);
    wrapTable(table as HTMLTableElement);

    const wrapper = document.querySelector(`.${TABLE_WRAPPER_CLASS}`);
    expect(wrapper).toBeInstanceOf(HTMLDivElement);
    expect(wrapper?.firstElementChild).toBe(table);
    expect(table?.dataset.githubTableEnhancer).toBe("true");
  });

  it("does not double-wrap an already enhanced table", () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <table data-github-table-enhancer="true"></table>
      </article>
    `;
    const table = document.querySelector("table") as HTMLTableElement;

    wrapTable(table);

    expect(document.querySelectorAll(`.${TABLE_WRAPPER_CLASS}`)).toHaveLength(0);
  });
});

describe("enhanceTables", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    setPathname("/owner/repo/blob/main/docs/index.md");
  });

  it("enhances every table inside the Markdown container", () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <table><tbody><tr><td>one</td></tr></tbody></table>
        <table><tbody><tr><td>two</td></tr></tbody></table>
      </article>
      <table><tbody><tr><td>outside</td></tr></tbody></table>
    `;

    enhanceTables();

    expect(document.querySelectorAll(`.markdown-body .${TABLE_WRAPPER_CLASS}`)).toHaveLength(2);
    expect(document.body.children[1].tagName).toBe("TABLE");
  });

  it("does nothing outside Markdown blob pages", () => {
    setPathname("/owner/repo/issues/1");
    document.body.innerHTML = `
      <article class="markdown-body">
        <table><tbody><tr><td>issue table</td></tr></tbody></table>
      </article>
    `;

    enhanceTables();

    expect(document.querySelector(`.${TABLE_WRAPPER_CLASS}`)).toBeNull();
  });

  it("does not wrap the same table twice when called repeatedly", () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <table><tbody><tr><td>one</td></tr></tbody></table>
      </article>
    `;

    enhanceTables();
    enhanceTables();

    expect(document.querySelectorAll(`.${TABLE_WRAPPER_CLASS}`)).toHaveLength(1);
  });
});
