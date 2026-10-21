import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as frontmatter from "./frontmatter/runtime";
import { useTableFixture } from "./test/table-fixture";

const { startTableEnhancer } = useTableFixture();
const flushMutations = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  window.history.replaceState(null, "", "/owner/repo/blob/main/test.md");
  document.body.innerHTML = `
    <aside>Outside</aside>
    <react-app id="first"><article class="markdown-body"><p>First</p></article></react-app>
    <react-app id="second"><article class="markdown-body"><p>Second</p></article></react-app>
  `;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function observe() {
  const reconcile = vi.spyOn(frontmatter, "reconcileFrontmatter");
  startTableEnhancer();
  await flushMutations();
  reconcile.mockClear();
  return reconcile;
}

describe("page mutation routing", () => {
  it("handles URL-only navigation and releases navigation listeners on disconnect", async () => {
    const navigation = new EventTarget();
    vi.stubGlobal("navigation", navigation);
    window.history.replaceState(null, "", "/owner/repo/tree/main");
    const article = document.querySelector("article");
    if (!article) throw new Error("Expected preview article");
    article.innerHTML = "<h2>Releases</h2><table><tbody><tr><td>Ready</td></tr></tbody></table>";
    const observer = startTableEnhancer();
    window.history.replaceState(null, "", "/owner/repo/blob/main/test.md");
    navigation.dispatchEvent(new Event("currententrychange"));
    await flushMutations();
    expect(document.querySelector("table")?.dataset.githubTableEnhancer).toBe("true");
    const reconcile = vi.spyOn(frontmatter, "reconcileFrontmatter");
    navigation.dispatchEvent(new Event("currententrychange"));
    observer.disconnect();
    window.dispatchEvent(new Event("pageshow"));
    await flushMutations();
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("rediscovers existing tables after a pathname change", async () => {
    window.history.replaceState(null, "", "/owner/repo/tree/main");
    const article = document.querySelector("article");
    if (!article) throw new Error("Expected preview article");
    article.innerHTML = "<h2>Releases</h2><table><tbody><tr><td>Ready</td></tr></tbody></table>";
    await observe();
    expect(document.querySelector("[data-github-table-enhancer]")).toBeNull();
    window.history.replaceState(null, "", "/owner/repo/blob/main/test.md");
    document.querySelector("aside")?.append(" navigated");
    await flushMutations();
    expect(document.querySelector("table")?.dataset.githubTableEnhancer).toBe("true");
  });

  it("skips frontmatter reconciliation for unrelated page changes", async () => {
    const reconcile = await observe();
    document.querySelector("aside")?.append(" changed");
    await flushMutations();
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("reconciles only the article whose text changed", async () => {
    const reconcile = await observe();
    const article = document.querySelector("#first article");
    const text = article?.querySelector("p")?.firstChild;
    if (text) text.textContent = "Updated";
    await flushMutations();
    expect(reconcile).toHaveBeenCalledExactlyOnceWith(new Set([article]));
  });

  it("limits late embedded data changes to articles in the same react-app", async () => {
    const reconcile = await observe();
    const script = document.createElement("script");
    script.type = "application/json";
    script.dataset.target = "react-app.embeddedData";
    script.textContent = "{}";
    document.querySelector("#first")?.prepend(script);
    await flushMutations();
    expect(reconcile).toHaveBeenCalledExactlyOnceWith(
      new Set([document.querySelector("#first article")]),
    );
    reconcile.mockClear();
    const text = script.firstChild;
    if (!text) throw new Error("Expected embedded JSON text");
    text.textContent = '{"payload":{}}';
    await flushMutations();
    expect(reconcile).toHaveBeenCalledExactlyOnceWith(
      new Set([document.querySelector("#first article")]),
    );
  });

  it("rechecks all articles when the pathname changes", async () => {
    const reconcile = await observe();
    window.history.replaceState(null, "", "/owner/repo/blob/main/other.md");
    document.querySelector("aside")?.append(" navigated");
    await flushMutations();
    expect(reconcile).toHaveBeenCalledExactlyOnceWith(
      new Set(document.querySelectorAll(".markdown-body")),
    );
  });
});
