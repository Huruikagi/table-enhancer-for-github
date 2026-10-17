import { expect, fixtureUrl, test } from "./extension-fixture";

const metadataSelector = ".github-table-enhancer-metadata";
const nativeSelector = "markdown-accessiblity-table";
const plainTable =
  "<table><tbody><tr><th>title</th><td>Release checklist</td></tr><tr><th>draft</th><td>false</td></tr></tbody></table>";
const nestedTable = `<table><tbody>
  <tr><th>title</th><td>Release checklist</td></tr>
  <tr><th>tags</th><td><table><tbody><tr><td>release</td><td>docs</td></tr></tbody></table></td></tr>
  <tr><th>versions</th><td><table><thead><tr><th>fpt</th><th>ghec</th></tr></thead><tbody><tr><td>*</td><td>*</td></tr></tbody></table></td></tr>
  <tr><th>description</th><td>First line. Second line.</td></tr>
  <tr><th>literal</th><td>&lt;img src=https://example.invalid/tracker&gt;</td></tr>
</tbody></table>`;
const nestedLines = [
  "---",
  "title: Release checklist",
  "tags: [release, docs]",
  "versions:",
  "  fpt: '*'",
  "  ghec: '*'",
  "description: |",
  "  First line.",
  "  Second line.",
  "literal: '<img src=https://example.invalid/tracker>'",
  "---",
];
const flatLines = ["---", "title: Release checklist", "draft: false", "---"];
const body = `<h1>Release checklist</h1><p>Review the release before publishing.</p>
<table id="body-table"><thead><tr><th>Task</th><th>Status</th></tr></thead><tbody><tr><td>Build</td><td>Ready</td></tr><tr><td>Review</td><td>Pending</td></tr></tbody></table>`;

function payload(lines: string[], table: string, file = "e2e-table-fixture.md") {
  const refInfo = { name: "main", currentOid: "a".repeat(40) };
  const path = `docs/${file}`;
  return {
    payload: {
      codeViewLayoutRoute: {
        repo: { ownerLogin: "owner", name: "github-table-enhancer" },
        path,
        refInfo,
      },
      codeViewBlobLayoutRoute: { path, refInfo },
      "codeViewBlobLayoutRoute.StyledBlob": { rawLines: [...lines, "", "# Release checklist"] },
      codeViewBlobRoute: {
        richText: `<article class="markdown-body"><markdown-accessiblity-table>${table}</markdown-accessiblity-table>${body}</article>`,
      },
    },
  };
}

function fixture(table: string, data?: unknown): string {
  const json =
    data === undefined
      ? ""
      : `<script type="application/json" data-target="react-app.embeddedData">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Frontmatter fixture</title><style>
    :root { color-scheme: light dark; --bgColor-default: #fff; --bgColor-muted: #f6f8fa; --fgColor-default: #1f2328; --fgColor-muted: #59636e; --borderColor-default: #d1d9e0; }
    @media (prefers-color-scheme: dark) { :root { --bgColor-default: #0d1117; --bgColor-muted: #151b23; --fgColor-default: #e6edf3; --fgColor-muted: #9198a1; --borderColor-default: #3d444d; } }
    body { margin: 0; background: var(--bgColor-default); color: var(--fgColor-default); font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    article { max-width: 700px; margin: auto; padding: 24px; }
    .markdown-body table { display: block; max-width: 100%; overflow: auto; border-collapse: collapse; }
    .markdown-body th, .markdown-body td { border: 1px solid var(--borderColor-default); padding: 6px 13px; }
    .markdown-body dl { padding: 0; } .markdown-body dl dt { padding: 0; margin-top: 16px; font-size: 1em; font-style: italic; font-weight: 600; }
    .markdown-body dl dd { padding: 0 16px; margin-bottom: 16px; }
    .markdown-body ul { padding-left: 2em; } .markdown-body li + li { margin-top: .25em; }
  </style></head><body><react-app>${json}<article class="markdown-body"><markdown-accessiblity-table>${table}</markdown-accessiblity-table>${body}</article></react-app></body></html>`;
}

for (const shape of ["flat", "nested"] as const) {
  test(`shows ${shape} frontmatter without additional requests`, async ({ page }, testInfo) => {
    const table = shape === "flat" ? plainTable : nestedTable;
    const lines = shape === "flat" ? flatLines : nestedLines;
    const requests: string[] = [];
    await page.route("**/*", async (route) => {
      requests.push(route.request().url());
      if (route.request().url() === fixtureUrl)
        await route.fulfill({
          body: fixture(table, payload(lines, table)),
          contentType: "text/html",
        });
      else await route.abort();
    });
    await page.goto(fixtureUrl);
    const view = page.locator(metadataSelector);
    await expect(view).toBeVisible();
    await expect(view.locator(":scope > summary")).toHaveText(
      shape === "flat" ? "Metadata2 items" : "Metadata5 items",
    );
    await expect(page.locator(nativeSelector)).toBeHidden();
    await expect(page.locator(".github-table-enhancer-scroll")).toHaveCount(1);

    if (shape === "nested") {
      await expect(view.locator(".gte-metadata-tags li")).toHaveText(["release", "docs"]);
      const branch = view.locator("dd details");
      await expect(branch).not.toHaveAttribute("open");
      await branch.locator(":scope > summary").click();
      await expect(branch.locator("dt")).toHaveText(["fpt", "ghec"]);
      await expect(view.locator("img")).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath("properties-light.png"), fullPage: true });
      await page.setViewportSize({ width: 360, height: 760 });
      await page.emulateMedia({ colorScheme: "dark" });
      expect(await view.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: testInfo.outputPath("properties-dark-narrow.png"),
        fullPage: true,
      });
    }

    const heading = view.locator(":scope > summary");
    await heading.focus();
    await page.keyboard.press("Enter");
    await expect(view).not.toHaveAttribute("open");
    await page.keyboard.press("Space");
    await expect(view).toHaveAttribute("open");
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("searchbox", { name: "Filter rows" }).fill("Ready");
    await expect(page.locator("#body-table tbody tr:visible")).toHaveCount(1);
    expect(requests).toEqual([fixtureUrl]);
  });
}

test("waits for matching embedded data and restores native markup across navigation", async ({
  page,
}) => {
  await page.route(fixtureUrl, (route) =>
    route.fulfill({ body: fixture(plainTable), contentType: "text/html" }),
  );
  await page.goto(fixtureUrl);
  await expect(page.locator(".github-table-enhancer-scroll")).toHaveCount(1);
  await expect(page.locator(metadataSelector)).toHaveCount(0);
  await expect(page.locator(nativeSelector)).toBeVisible();
  await page.evaluate(
    (data) => {
      const script = document.createElement("script");
      script.type = "application/json";
      script.dataset.target = "react-app.embeddedData";
      script.textContent = JSON.stringify(data);
      document.querySelector("react-app")?.prepend(script);
    },
    payload(flatLines, plainTable),
  );
  await expect(page.locator(metadataSelector)).toBeVisible();

  const nextTable = plainTable.replace("Release checklist", "Next document");
  await page.evaluate(
    ({ table, content }) => {
      history.pushState(null, "", "next.md");
      const article = document.querySelector(".markdown-body");
      if (article)
        article.innerHTML = `<markdown-accessiblity-table>${table}</markdown-accessiblity-table>${content}`;
    },
    { table: nextTable, content: body },
  );
  await expect(page.locator(metadataSelector)).toHaveCount(0);
  await expect(page.locator(nativeSelector)).toBeVisible();
  await page.locator('script[data-target="react-app.embeddedData"]').evaluate(
    (script, data) => {
      script.textContent = JSON.stringify(data);
    },
    payload(["---", "title: Next document", "draft: false", "---"], nextTable, "next.md"),
  );
  await expect(page.locator(metadataSelector)).toContainText("Next document");
  await expect(page.locator(metadataSelector)).toHaveCount(1);
  await expect(page.locator(".github-table-enhancer-scroll")).toHaveCount(1);
});

test.describe("Japanese metadata", () => {
  test.use({ locale: "ja" });
  test("localizes metadata labels", async ({ page }) => {
    await page.route(fixtureUrl, (route) =>
      route.fulfill({
        body: fixture(plainTable, payload(flatLines, plainTable)),
        contentType: "text/html",
      }),
    );
    await page.goto(fixtureUrl);
    await expect(page.locator(`${metadataSelector} > summary`)).toHaveText("メタデータ2項目");
  });
});

// UI Service removes serialized hydration data from the DOM. The only source
// available here lives in the page's MAIN world, just like GitHub's query cache.
function cacheQueries(lines: string[], table: string, file = "e2e-table-fixture.md") {
  const data = payload(lines, table, file).payload;
  const prefix = "/owner/github-table-enhancer";
  const path = `main/docs/${file}`;
  return [
    [
      "codeViewLayoutRoute",
      "mainQuery",
      `${prefix}/_layout`,
      { payload: data.codeViewLayoutRoute },
    ],
    [
      "codeViewBlobLayoutRoute",
      "mainQuery",
      `${prefix}/_layout/${path}`,
      { payload: data.codeViewBlobLayoutRoute },
    ],
    [
      "codeViewBlobRoute",
      "mainQuery",
      `${prefix}/blob/${path}`,
      { payload: data.codeViewBlobRoute },
    ],
    [
      "codeViewBlobLayoutRoute",
      "codeViewBlobLayoutRoute.StyledBlob",
      `${prefix}/_styled/${path}`,
      data["codeViewBlobLayoutRoute.StyledBlob"],
    ],
  ].map(([route, name, pathname, data]) => ({
    queryKey: ["code-view", route, "", name, { pathname }],
    state: { data, status: "success", fetchStatus: "idle", isInvalidated: false },
  }));
}

for (const shape of ["flat", "nested"] as const) {
  test(`reads ${shape} metadata from the page cache with no embedded JSON or extra requests`, async ({
    page,
  }) => {
    const table = shape === "flat" ? plainTable : nestedTable;
    const lines = shape === "flat" ? flatLines : nestedLines;
    type Query = ReturnType<typeof cacheQueries>[number];
    const requests: string[] = [];
    await page.route("**/*", async (route) => {
      requests.push(route.request().url());
      if (route.request().url() === fixtureUrl)
        await route.fulfill({
          body: fixture(table).replaceAll("react-app", "main"),
          contentType: "text/html",
        });
      else await route.abort();
    });
    await page.addInitScript(
      (initial: Query[]) => {
        const listeners = new Set<(event: { query: Query }) => void>();
        let queries: Query[] = [];
        Object.assign(window, {
          __TANSTACK_QUERY_CLIENT__: {
            getQueryCache: () => ({
              findAll: ({ predicate }: { predicate: (query: Query) => boolean }) =>
                queries.filter(predicate),
              subscribe: (listener: (event: { query: Query }) => void) => {
                listeners.add(listener);
                return () => listeners.delete(listener);
              },
            }),
          },
          updateFixtureCache(next: Query[]) {
            const changed = [...queries, ...next];
            queries = next;
            for (const query of changed) for (const listener of [...listeners]) listener({ query });
          },
        });
        // Hydration completes after content scripts have started.
        setTimeout(() => {
          queries = initial;
          for (const query of queries) for (const listener of [...listeners]) listener({ query });
        }, 300);
      },
      cacheQueries(lines, table),
    );
    await page.goto(fixtureUrl);
    const view = page.locator(metadataSelector);
    await expect(view).toBeVisible();
    await expect(page.locator('script[data-target="react-app.embeddedData"]')).toHaveCount(0);
    await expect(page.locator(nativeSelector)).toBeHidden();
    await expect(page.locator(".github-table-enhancer-scroll")).toHaveCount(1);
    await view.locator(":scope > summary").click();
    await page.evaluate(() => {
      const element = document.createElement("aside");
      element.textContent = "Unrelated page update";
      document.body.append(element);
    });
    await expect(view).not.toHaveAttribute("open");

    const nextTable = plainTable.replace("Release checklist", "Next document");
    await page.evaluate(
      ({ table, content }) => {
        history.pushState(null, "", "next.md");
        const article = document.querySelector(".markdown-body");
        if (article)
          article.innerHTML = `<markdown-accessiblity-table>${table}</markdown-accessiblity-table>${content}`;
      },
      { table: nextTable, content: body },
    );
    await expect(view).toHaveCount(0);
    await expect(page.locator(nativeSelector)).toBeVisible();
    await page.evaluate(
      (queries: Query[]) => {
        (window as unknown as { updateFixtureCache: (data: Query[]) => void }).updateFixtureCache(
          queries,
        );
      },
      cacheQueries(["---", "title: Next document", "draft: false", "---"], nextTable, "next.md"),
    );
    await expect(view).toContainText("Next document");
    await expect(view).toHaveCount(1);
    await page.evaluate(() => {
      (window as unknown as { updateFixtureCache: (data: Query[]) => void }).updateFixtureCache([]);
    });
    await expect(view).toHaveCount(0);
    await expect(page.locator(nativeSelector)).toBeVisible();
    expect(requests).toEqual([fixtureUrl]);
  });
}
