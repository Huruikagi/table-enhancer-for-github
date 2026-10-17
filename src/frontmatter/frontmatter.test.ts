import { beforeEach, describe, expect, it } from "vitest";
import { enhanceTables, TABLE_WRAPPER_CLASS } from "../table/enhancer";
import { useTableFixture } from "../test/table-fixture";
import { EMBEDDED_DATA_SELECTOR, reconcileFrontmatter } from "./runtime";
import { parseFrontmatter, readMetadataSource } from "./source";

const { startTableEnhancer } = useTableFixture();

const pathname = "/owner/repo/blob/main/docs/test.md";
const table = "<table><tbody><tr><th>title</th><td>Example</td></tr></tbody></table>";
const native = `<markdown-accessiblity-table>${table}</markdown-accessiblity-table>`;
const bodyTable =
  '<h2>Body</h2><table id="body"><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Example</td></tr></tbody></table>';
const metadataSelector = ".github-table-enhancer-metadata";

function embedded(lines = ["---", "title: Example", "---"], markup = native) {
  const refInfo = { name: "main", currentOid: "a".repeat(40) };
  return {
    payload: {
      codeViewLayoutRoute: {
        repo: { ownerLogin: "owner", name: "repo" },
        path: "docs/test.md",
        refInfo,
      },
      codeViewBlobLayoutRoute: { path: "docs/test.md", refInfo: { ...refInfo } },
      "codeViewBlobLayoutRoute.StyledBlob": { rawLines: lines },
      codeViewBlobRoute: {
        richText: `<article class="markdown-body">${markup}${bodyTable}</article>`,
      },
    },
  };
}

function install(data: unknown = embedded(), markup = native): HTMLScriptElement {
  document.body.innerHTML = `<react-app><article class="markdown-body">${markup}${bodyTable}</article></react-app>`;
  const script = document.createElement("script");
  script.type = "application/json";
  script.dataset.target = "react-app.embeddedData";
  script.textContent = JSON.stringify(data);
  document.querySelector("react-app")?.prepend(script);
  return script;
}

beforeEach(() => {
  window.history.replaceState(null, "", pathname);
});

describe("frontmatter parsing", () => {
  it("preserves mappings, sequences, multiline strings, empty values and large integers", () => {
    const result = parseFrontmatter([
      "---",
      "title: Example",
      "tags: [docs, release]",
      "versions:",
      "  fpt: '*'",
      "draft: false",
      "description: |",
      "  first",
      "  second",
      "empty: ''",
      "missing:",
      "large: 9007199254740993",
      "__proto__: safe",
      "---",
    ]);
    expect(result?.get("versions")).toEqual(new Map([["fpt", "*"]]));
    expect(result?.get("tags")).toEqual(["docs", "release"]);
    expect(result?.get("description")).toBe("first\nsecond\n");
    expect(result?.get("draft")).toBe(false);
    expect(result?.get("empty")).toBe("");
    expect(result?.get("missing")).toBeNull();
    expect(result?.get("large")).toBe(9007199254740993n);
    expect(result?.get("__proto__")).toBe("safe");
  });

  it.each([
    ["# Heading", "---", "title: Example", "---"],
    ["---", "title: Example"],
    ["---", "plain text", "---"],
    ["---", "- list", "---"],
    ["---", "title: [broken", "---"],
    ["---", "title: one", "title: two", "---"],
    ["---", "root: &root [*root]", "---"],
    ["---", "value: !custom test", "---"],
    ["---", `title: ${"a".repeat(65_536)}`, "---"],
    ["---", `values: [${"a,".repeat(1_001)}]`, "---"],
    ["---", `value: ${"[".repeat(22)}a${"]".repeat(22)}`, "---"],
  ])("leaves unsupported or invalid YAML native: %j", (...lines) => {
    expect(parseFrontmatter(lines)).toBeNull();
  });

  it("accepts BOM and whitespace on delimiters", () => {
    expect(parseFrontmatter(["\uFEFF--- ", "title: Example", "---\t"])?.get("title")).toBe(
      "Example",
    );
  });
});

describe("metadata discovery and lifecycle", () => {
  it("renders flat frontmatter and leaves the following body table enhanced", () => {
    install();
    enhanceTables();
    const view = document.querySelector<HTMLDetailsElement>(metadataSelector);
    expect(view?.open).toBe(true);
    expect(view?.textContent).toContain("Metadata1 itemtitleExample");
    expect(document.querySelector<HTMLElement>("markdown-accessiblity-table")?.hidden).toBe(true);
    expect(document.querySelectorAll(`.${TABLE_WRAPPER_CLASS}`)).toHaveLength(1);
    expect(document.querySelector("#body")?.getAttribute("data-github-table-enhancer")).toBe(
      "true",
    );
    if (view) view.open = false;
    enhanceTables();
    expect(document.querySelectorAll(metadataSelector)).toHaveLength(1);
    expect(view?.open).toBe(false);
  });

  it("renders sequences as tags, folds nested maps and treats HTML as text", () => {
    const markup =
      "<table><tbody><tr><th>tags</th><td>docs release</td></tr><tr><th>nested</th><td>value</td></tr><tr><th>title</th><td>&lt;img src=x onerror=alert(1)&gt;</td></tr></tbody></table>";
    install(
      embedded(
        [
          "---",
          "tags: [docs, release]",
          "nested: {value: yes}",
          "title: '<img src=x onerror=alert(1)>'",
          "---",
        ],
        markup,
      ),
      markup,
    );
    enhanceTables();
    expect(document.querySelectorAll(`${metadataSelector} .gte-metadata-tags li`)).toHaveLength(2);
    expect(document.querySelector<HTMLDetailsElement>(`${metadataSelector} dd details`)?.open).toBe(
      false,
    );
    expect(document.querySelector(`${metadataSelector} img`)).toBeNull();
    expect(document.querySelector(metadataSelector)?.textContent).toContain(
      "<img src=x onerror=alert(1)>",
    );
  });

  it.each([
    "missing",
    "malformed",
    "wrong path",
    "wrong ref",
    "wrong commit",
    "stale HTML",
    "no frontmatter",
    "ambiguous",
  ])("keeps a metadata-shaped table native when data is %s", (reason) => {
    const data = embedded();
    if (reason === "wrong path") data.payload.codeViewLayoutRoute.path = "other.md";
    if (reason === "wrong ref") data.payload.codeViewBlobLayoutRoute.refInfo.name = "other";
    if (reason === "wrong commit")
      data.payload.codeViewBlobLayoutRoute.refInfo.currentOid = "b".repeat(40);
    if (reason === "stale HTML")
      data.payload.codeViewBlobRoute.richText = data.payload.codeViewBlobRoute.richText.replace(
        "Example",
        "Old",
      );
    if (reason === "no frontmatter")
      data.payload["codeViewBlobLayoutRoute.StyledBlob"].rawLines = ["# Title"];
    const script = install(data);
    if (reason === "missing") script.remove();
    if (reason === "malformed") script.textContent = "{";
    if (reason === "ambiguous") script.after(script.cloneNode(true));
    enhanceTables();
    expect(document.querySelector(metadataSelector)).toBeNull();
    expect(document.querySelector("markdown-accessiblity-table")?.innerHTML).toBe(table);
    expect(document.querySelector<HTMLElement>("markdown-accessiblity-table")?.hidden).toBe(false);
  });

  it("does not transform a normal Markdown table at the beginning of a file", () => {
    const markup =
      "<table><thead><tr><th>title</th></tr></thead><tbody><tr><td>Example</td></tr></tbody></table>";
    install(embedded(["---", "title: Example", "---"], markup), markup);
    enhanceTables();
    expect(document.querySelector(metadataSelector)).toBeNull();
    expect(document.querySelectorAll(`.${TABLE_WRAPPER_CLASS}`)).toHaveLength(2);
  });

  it("restores native content when navigation leaves the matching file", () => {
    install();
    enhanceTables();
    window.history.replaceState(null, "", "/owner/repo/blob/main/other.md");
    enhanceTables();
    expect(document.querySelector(metadataSelector)).toBeNull();
    expect(document.querySelector<HTMLElement>("markdown-accessiblity-table")?.hidden).toBe(false);
  });

  it("cleans up detached articles and mounts again when they return", () => {
    install();
    enhanceTables();
    const article = document.querySelector(".markdown-body");
    article?.remove();
    reconcileFrontmatter();
    expect(article?.querySelector(metadataSelector)).toBeNull();
    expect(article?.querySelector<HTMLElement>("markdown-accessiblity-table")?.hidden).toBe(false);
    if (article) document.querySelector("react-app")?.append(article);
    enhanceTables();
    expect(article?.querySelectorAll(metadataSelector)).toHaveLength(1);
  });

  it("handles late embedded data and character-data updates without remount loops", async () => {
    const script = install({});
    const observer = startTableEnhancer();
    try {
      expect(document.querySelector(metadataSelector)).toBeNull();
      script.textContent = JSON.stringify(embedded());
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(document.querySelectorAll(metadataSelector)).toHaveLength(1);
      if (script.firstChild) script.firstChild.textContent = "{}";
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(document.querySelector(metadataSelector)).toBeNull();
      expect(document.querySelector<HTMLElement>("markdown-accessiblity-table")?.hidden).toBe(
        false,
      );
    } finally {
      observer.disconnect();
    }
  });

  it("keeps a directly rendered table stable while hiding and restoring it", async () => {
    const script = install(embedded(["---", "title: Example", "---"], table), table);
    const observer = startTableEnhancer();
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(document.querySelectorAll(metadataSelector)).toHaveLength(1);
      expect(document.querySelector<HTMLTableElement>(".markdown-body > table")?.hidden).toBe(true);
      script.remove();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(document.querySelector(metadataSelector)).toBeNull();
      expect(document.querySelector(".markdown-body > table")?.outerHTML).toBe(table);
    } finally {
      observer.disconnect();
    }
  });

  it("preserves empty collections and folds lists of objects", () => {
    const markup =
      "<table><tbody><tr><th>emptyMap</th><td>{}</td></tr><tr><th>emptyList</th><td>[]</td></tr><tr><th>people</th><td>Alice</td></tr></tbody></table>";
    install(
      embedded(["---", "emptyMap: {}", "emptyList: []", "people: [{name: Alice}]", "---"], markup),
      markup,
    );
    enhanceTables();
    const view = document.querySelector(metadataSelector);
    expect(view?.textContent).toContain("emptyMap{}emptyList[]");
    expect(view?.querySelector("ol li")?.textContent).toContain("nameAlice");
    expect(view?.querySelector<HTMLDetailsElement>("dd details")?.open).toBe(false);
  });

  it("matches encoded file paths and slash-containing branch names", () => {
    const data = embedded();
    data.payload.codeViewLayoutRoute.path = "docs/日本語.md";
    data.payload.codeViewBlobLayoutRoute.path = "docs/日本語.md";
    data.payload.codeViewLayoutRoute.refInfo.name = "feature/frontmatter";
    data.payload.codeViewBlobLayoutRoute.refInfo.name = "feature/frontmatter";
    install(data);
    window.history.replaceState(
      null,
      "",
      "/owner/repo/blob/feature/frontmatter/docs/%E6%97%A5%E6%9C%AC%E8%AA%9E.md",
    );
    enhanceTables();
    expect(document.querySelector(metadataSelector)).not.toBeNull();
    expect(document.querySelectorAll(EMBEDDED_DATA_SELECTOR)).toHaveLength(1);
  });

  it("does not accept an unknown embedded-data layout", () => {
    expect(
      readMetadataSource('{"payload":{"blob":{"rawLines":["---","title: Example","---"]}}}'),
    ).toBeNull();
  });
});
