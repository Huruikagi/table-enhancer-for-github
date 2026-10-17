import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startMetadataCacheBridge } from "./cache-bridge";
import { CACHE_SOURCE_ATTRIBUTE, type CachedQuery, readCachedMetadata } from "./cache-source";
import { readMetadataSource } from "./source";

const pathname = "/owner/repo/blob/main/docs/test.md";
const table = "<table><tbody><tr><th>title</th><td>Example</td></tr></tbody></table>";
const refInfo = { name: "main", currentOid: "a".repeat(40) };
function queries(): CachedQuery[] {
  const entries = [
    [
      "codeViewLayoutRoute",
      "mainQuery",
      "/owner/repo/_layout",
      {
        payload: {
          repo: { ownerLogin: "owner", name: "repo", privateAccountData: "omit" },
          path: "docs/test.md",
          refInfo,
        },
        meta: { unrelated: "omit" },
      },
    ],
    [
      "codeViewBlobLayoutRoute",
      "mainQuery",
      "/owner/repo/_layout/main/docs/test.md",
      {
        payload: { path: "docs/test.md", refInfo },
      },
    ],
    [
      "codeViewBlobRoute",
      "mainQuery",
      pathname,
      {
        payload: {
          richText: `<article class="markdown-body"><markdown-accessiblity-table>${table}</markdown-accessiblity-table><p>omit body</p></article>`,
        },
      },
    ],
    [
      "codeViewBlobLayoutRoute",
      "codeViewBlobLayoutRoute.StyledBlob",
      "/owner/repo/_styled/main/docs/test.md",
      {
        rawLines: ["---", "title: Example", "---", "omit body"],
      },
    ],
  ];
  return entries.map(([route, name, path, data]) => ({
    queryKey: ["code-view", route, "", name, { pathname: path }],
    state: { data, status: "success", fetchStatus: "idle", isInvalidated: false },
  }));
}

let stop: (() => void) | undefined;
beforeEach(() => {
  window.history.replaceState(null, "", pathname);
});
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("UI Service cache source", () => {
  it("projects only the current file header and preview table into the existing validator", () => {
    const json = readCachedMetadata(queries(), pathname);
    expect(json).not.toBeNull();
    expect(json).not.toContain("omit");
    const source = readMetadataSource(json ?? "");
    expect(source?.pathname).toBe(pathname);
    expect(source?.values.get("title")).toBe("Example");
    expect(source?.tableHTML).toBe(table);
  });

  it("accepts the deferred StyledBlob response envelope", () => {
    const data = queries();
    data[3].state.data = { payload: { "codeViewBlobLayoutRoute.StyledBlob": data[3].state.data } };
    expect(readMetadataSource(readCachedMetadata(data, pathname) ?? "")?.values.get("title")).toBe(
      "Example",
    );
  });

  it.each([
    "missing",
    "other path",
    "other app",
    "fetching",
    "invalidated",
    "duplicate",
    "no delimiter",
    "oversized",
  ])("fails closed for %s source", (reason) => {
    const data = queries();
    if (reason === "missing") data.pop();
    if (reason === "other path")
      data[3].queryKey = [
        "code-view",
        "codeViewBlobLayoutRoute",
        "",
        "codeViewBlobLayoutRoute.StyledBlob",
        { pathname: "/owner/repo/_styled/main/other.md" },
      ];
    if (reason === "other app") data[3].queryKey = ["other", ...data[3].queryKey.slice(1)];
    if (reason === "fetching") data[3].state.fetchStatus = "fetching";
    if (reason === "invalidated") data[3].state.isInvalidated = true;
    if (reason === "duplicate") data.push(data[3]);
    if (reason === "no delimiter") data[3].state.data = { rawLines: ["title: Example"] };
    if (reason === "oversized")
      data[3].state.data = { rawLines: ["---", "a".repeat(65_536), "---"] };
    expect(readCachedMetadata(data, pathname)).toBeNull();
  });

  it("retains independent path and commit checks after projection", () => {
    const data = queries();
    data[1].state.data = {
      payload: { path: "docs/test.md", refInfo: { ...refInfo, currentOid: "b".repeat(40) } },
    };
    expect(readMetadataSource(readCachedMetadata(data, pathname) ?? "")).toBeNull();
  });

  it("ignores unrelated cached files and rejects unsupported URLs", () => {
    const data = queries();
    data.push({ queryKey: ["account"], state: { data: "omit secret" } });
    expect(readCachedMetadata(data, pathname)).not.toContain("secret");
    expect(readCachedMetadata(data, "/owner/repo/issues/1")).toBeNull();
    expect(readCachedMetadata(data, "/%ff")).toBeNull();
  });
});

describe("passive cache bridge", () => {
  it("handles late hydration, cache updates, navigation, and cleanup without fetching", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    let data = queries();
    let listener: (event: { query: CachedQuery }) => void = () => {};
    const unsubscribe = vi.fn();
    const cache = {
      findAll: ({ predicate }: { predicate: (query: CachedQuery) => boolean }) =>
        data.filter(predicate),
      subscribe: (callback: typeof listener) => {
        listener = callback;
        return unsubscribe;
      },
    };
    stop = startMetadataCacheBridge();
    const selector = `script[${CACHE_SOURCE_ATTRIBUTE}]`;
    expect(document.querySelector(selector)).toBeNull();
    vi.stubGlobal("__TANSTACK_QUERY_CLIENT__", { getQueryCache: () => cache });
    await vi.advanceTimersByTimeAsync(1_000);
    const script = document.querySelector(selector);
    expect(script?.textContent).toContain("Example");
    const text = script?.firstChild;
    listener({ query: data[0] });
    await Promise.resolve();
    expect(script?.firstChild).toBe(text);
    data = [];
    listener({ query: queries()[3] });
    await Promise.resolve();
    expect(document.querySelector(selector)).toBeNull();
    data = queries();
    listener({ query: data[3] });
    await Promise.resolve();
    expect(document.querySelector(selector)).not.toBeNull();
    window.history.pushState(null, "", "/owner/repo/blob/main/other.md");
    document.body.append(document.createElement("p"));
    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector(selector)).toBeNull();
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("stops retrying unavailable APIs and tolerates an incompatible cache", async () => {
    vi.useFakeTimers();
    const getQueryCache = vi.fn(() => {
      throw new Error("changed API");
    });
    vi.stubGlobal("__TANSTACK_QUERY_CLIENT__", { getQueryCache });
    stop = startMetadataCacheBridge();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(getQueryCache).toHaveBeenCalledTimes(30);
    expect(vi.getTimerCount()).toBe(0);
    expect(document.querySelector(`[${CACHE_SOURCE_ATTRIBUTE}]`)).toBeNull();
  });
});
