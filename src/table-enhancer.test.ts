import { describe, expect, it } from "vitest";
import {
  enhanceTables,
  TABLE_CONTROLS_TAG,
  TABLE_WRAPPER_CLASS,
  wrapTable,
} from "./table/enhancer";
import {
  flushPromises,
  getTable,
  renderMarkdownTables,
  setPathname,
  useTableFixture,
} from "./test/table-fixture";

const { startTableEnhancer } = useTableFixture();

describe("table mounting", () => {
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
});

describe("enhanceTables", () => {
  it("enhances independent tables inside the Markdown container", () => {
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

  it("leaves nested frontmatter tables untouched, including scans rooted at a child", () => {
    renderMarkdownTables(`
      <markdown-accessiblity-table id="metadata">
        <table><tbody><tr><th>versions</th><td>
          <table id="nested"><thead><tr><th>fpt</th></tr></thead>
            <tbody><tr><td><div dir="auto">*</div></td></tr></tbody>
          </table>
        </td></tr></tbody></table>
      </markdown-accessiblity-table>
      <h2>Release matrix</h2>
      <table id="regular"><tbody><tr><td>one</td></tr></tbody></table>
    `);
    const metadata = document.querySelector("#metadata");
    const originalMarkup = metadata?.innerHTML;

    enhanceTables();
    enhanceTables(getTable("#nested"));
    enhanceTables();

    expect(metadata?.innerHTML).toBe(originalMarkup);
    expect(document.querySelectorAll(`.${TABLE_WRAPPER_CLASS}`)).toHaveLength(1);
    expect(getTable("#regular").dataset.githubTableEnhancer).toBe("true");
  });

  it("leaves a nested table group added after startup untouched", async () => {
    renderMarkdownTables("");
    const group = document.createElement("table");
    group.innerHTML = `<tbody><tr><th>metadata</th><td><div>
      <table><tbody><tr><td>
        <table><tbody><tr><td>deep value</td></tr></tbody></table>
      </td></tr></tbody></table>
    </div></td></tr></tbody>`;
    const originalMarkup = group.outerHTML;
    const observer = startTableEnhancer();

    try {
      document.querySelector(".markdown-body")?.append(group);
      await flushPromises();

      expect(group.outerHTML).toBe(originalMarkup);
      expect(document.querySelector(`.${TABLE_WRAPPER_CLASS}`)).toBeNull();
    } finally {
      observer.disconnect();
    }
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

  it("does not miss a table added between the initial scan and observer startup", () => {
    renderMarkdownTables("");
    const RealMutationObserver = globalThis.MutationObserver;

    class DelayedMutationObserver extends RealMutationObserver {
      constructor(callback: MutationCallback) {
        super(callback);
        document
          .querySelector(".markdown-body")
          ?.insertAdjacentHTML(
            "beforeend",
            "<table><tbody><tr><td>table added during startup</td></tr></tbody></table>",
          );
      }
    }

    globalThis.MutationObserver = DelayedMutationObserver;

    try {
      const observer = startTableEnhancer();
      observer.disconnect();

      expect(document.querySelectorAll(`.${TABLE_WRAPPER_CLASS}`)).toHaveLength(1);
    } finally {
      globalThis.MutationObserver = RealMutationObserver;
    }
  });
});
