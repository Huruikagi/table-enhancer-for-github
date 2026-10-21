import { expect, fixtureUrl, test } from "./extension-fixture";

const preview = `<article class="markdown-body"><h2>Releases</h2>
  <table><thead><tr><th>Name</th><th>Status</th></tr></thead>
  <tbody><tr><td>Example</td><td>Ready</td></tr></tbody></table></article>`;

test.beforeEach(async ({ page }) => {
  await page.route("https://github.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head><title>Navigation fixture</title></head>
        <body><main>${preview}</main></body></html>`,
    }),
  );
});

for (const entry of [
  "/",
  "/owner/github-table-enhancer",
  "/owner/github-table-enhancer/tree/main",
  "/owner/github-table-enhancer/blob/main/app.ts",
]) {
  test(`enhances same-document navigation from ${entry}`, async ({ page }) => {
    await page.goto(`https://github.com${entry}`);
    const controls = page.getByRole("button", { name: "Freeze", exact: true });
    await expect(controls).toHaveCount(0);

    // The preview already exists: no post-navigation DOM mutation can rescue discovery.
    await page.evaluate((url) => window.history.pushState(null, "", url), fixtureUrl);
    await expect(controls).toHaveCount(1);
    await expect(page.locator(".github-table-enhancer-scroll")).toHaveCSS("overflow-x", "auto");

    // Replace the preview on a non-Markdown route, then restore via browser history.
    await page.evaluate(
      ({ entry, preview }) => {
        window.history.pushState(null, "", entry);
        const main = document.querySelector("main");
        if (!main) throw new Error("Expected preview container");
        main.innerHTML = preview;
      },
      { entry, preview },
    );
    await expect(controls).toHaveCount(0);
    await page.goBack();
    await expect(controls).toHaveCount(1);
    await page.evaluate(() =>
      window.history.replaceState(null, "", `${location.pathname}?view=preview#releases`),
    );
    await expect(controls).toHaveCount(1);
  });
}

test("rescans a preview rendered before its URL changes", async ({ page }) => {
  await page.goto(fixtureUrl);
  const controls = page.getByRole("button", { name: "Freeze", exact: true });
  await expect(controls).toHaveCount(1);
  await page.evaluate((markup) => {
    window.history.pushState(null, "", "/owner/github-table-enhancer/tree/main");
    const main = document.querySelector("main");
    if (!main) throw new Error("Expected preview container");
    main.innerHTML = markup;
  }, preview);
  await expect(controls).toHaveCount(0);
  await page.evaluate((url) => window.history.replaceState(null, "", url), fixtureUrl);
  await expect(controls).toHaveCount(1);
});

for (const suffix of [".MD", ".md?view=preview#releases"]) {
  test(`loads Markdown URLs ending in ${suffix}`, async ({ page }) => {
    await page.goto(fixtureUrl.replace(/\.md$/, suffix));
    await expect(page.getByRole("button", { name: "Freeze", exact: true })).toHaveCount(1);
  });
}
