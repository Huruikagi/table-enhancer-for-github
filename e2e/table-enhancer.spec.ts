import { expect, fixtureUrl, test } from "./extension-fixture";

const githubBlobFixture = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>E2E Table Fixture</title>
    <style>
      body {
        color: #24292f;
        font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 0;
      }

      .repository-content {
        max-width: 720px;
        padding: 24px;
      }

      .markdown-body table {
        border-collapse: collapse;
        display: block;
        margin-bottom: 16px;
        max-width: 100%;
        overflow: auto;
      }

      .markdown-body th,
      .markdown-body td {
        border: 1px solid #d0d7de;
        padding: 6px 13px;
      }
    </style>
  </head>
  <body>
    <main class="repository-content">
      <article class="markdown-body">
        <h1>E2E Table Fixture</h1>
        <h2>Wide Release Matrix</h2>
        <table>
          <thead>
            <tr>
              <th>Repository</th>
              <th>Branch</th>
              <th>Runtime</th>
              <th>Package Manager</th>
              <th>Very Long Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>owner/github-table-enhancer</td>
              <td>main</td>
              <td>Node.js 22.16.0</td>
              <td>pnpm 9.15.0</td>
              <td>Wide release matrix row with intentionally long text so the rendered table should be wider than the viewport.</td>
            </tr>
            <tr>
              <td>owner/github-table-enhancer</td>
              <td>feature/e2e</td>
              <td>Chrome Stable</td>
              <td>Chrome extension loader</td>
              <td>Confirm that horizontal scrolling is owned by the table wrapper instead of the whole page.</td>
            </tr>
          </tbody>
        </table>

        <h2>Long Table For Frozen Rows</h2>
        <table>
          <thead>
            <tr>
              <th>Step</th>
              <th>Area</th>
              <th>Command Or Check</th>
              <th>Expected Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>01</td>
              <td>Setup</td>
              <td>Open this fixture from a GitHub Markdown blob page.</td>
              <td>The Freeze control appears above this table.</td>
            </tr>
            <tr>
              <td>02</td>
              <td>Filter</td>
              <td>Type rebuild into the filter box.</td>
              <td>Only the rebuild row should remain visible.</td>
            </tr>
            <tr>
              <td>03</td>
              <td>Rebuild</td>
              <td>Reload the extension after every rebuild.</td>
              <td>The rebuilt content script is active.</td>
            </tr>
            <tr>
              <td>04</td>
              <td>Reset</td>
              <td>Click Reset table view.</td>
              <td>Freeze, filter, wrap, and fitted widths are cleared.</td>
            </tr>
          </tbody>
        </table>
      </article>
    </main>
  </body>
</html>`;

test.beforeEach(async ({ page }) => {
  await page.route(fixtureUrl, async (route) => {
    await route.fulfill({
      body: githubBlobFixture,
      contentType: "text/html",
    });
  });
});

test("enhances GitHub Markdown blob tables from the loaded extension", async ({ page }) => {
  await page.goto(fixtureUrl);

  const wrappers = page.locator(".github-table-enhancer-scroll");
  await expect(wrappers).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Freeze" })).toHaveCount(2);

  const firstWrapper = wrappers.first();
  await expect
    .poll(() => firstWrapper.evaluate((wrapper) => wrapper.scrollWidth > wrapper.clientWidth))
    .toBe(true);
  await expect(firstWrapper.locator("table")).toHaveAttribute("data-github-table-enhancer", "true");
});

test("filters rows and resets the current table view", async ({ page }) => {
  await page.goto(fixtureUrl);

  const longTableWrapper = page.locator(".github-table-enhancer-scroll").nth(1);
  const table = longTableWrapper.locator("table");

  await longTableWrapper.getByRole("button", { name: "Filter" }).click();
  await longTableWrapper.getByLabel("Filter rows").fill("rebuild");

  await expect(table.locator("tbody tr").nth(0)).toHaveAttribute(
    "data-github-table-enhancer-filtered-row",
    "true",
  );
  await expect(table.locator("tbody tr").nth(2)).not.toHaveAttribute(
    "data-github-table-enhancer-filtered-row",
    "true",
  );

  await longTableWrapper.getByRole("button", { name: "Fit" }).click();
  await expect(table).toHaveAttribute("data-github-table-enhancer-wrapped-columns", "true");

  await longTableWrapper.getByRole("button", { name: "Reset table view" }).click();
  await expect(table.locator("tbody tr").nth(0)).not.toHaveAttribute(
    "data-github-table-enhancer-filtered-row",
    "true",
  );
  await expect(table).not.toHaveAttribute("data-github-table-enhancer-wrapped-columns", "true");
});

test("toggles regular expression filtering and reports invalid expressions", async ({ page }) => {
  await page.goto(fixtureUrl);

  const wrapper = page.locator(".github-table-enhancer-scroll").nth(1);
  const rows = wrapper.locator("tbody tr");
  await wrapper.getByRole("button", { name: "Filter" }).click();
  const regularExpressionButton = wrapper.getByRole("button", {
    name: "Use regular expression",
  });
  await regularExpressionButton.click();
  await wrapper.getByLabel("Filter rows").fill("03[\\s\\S]*active");

  await expect(regularExpressionButton).toHaveAttribute("aria-pressed", "true");
  await expect(rows.nth(2)).not.toHaveAttribute("data-github-table-enhancer-filtered-row", "true");
  await expect(rows.nth(0)).toHaveAttribute("data-github-table-enhancer-filtered-row", "true");

  await wrapper.getByLabel("Filter rows").fill("[");
  await expect(wrapper.getByRole("alert")).toHaveText("Invalid regular expression");
  await expect(
    wrapper.locator('tbody tr[data-github-table-enhancer-filtered-row="true"]'),
  ).toHaveCount(0);
});

test("sorts rows through all three states and resets to the source order", async ({ page }) => {
  await page.goto(fixtureUrl);

  const wrapper = page.locator(".github-table-enhancer-scroll").nth(1);
  const rows = wrapper.locator("tbody tr");
  const sortButton = wrapper.getByRole("button", { name: "Sort by column 2" });

  await sortButton.click();
  await expect(rows.nth(0).locator("td").nth(1)).toHaveText("Filter");
  await expect(wrapper.locator("thead th").nth(1)).toHaveAttribute("aria-sort", "ascending");

  await sortButton.click();
  await expect(rows.nth(0).locator("td").nth(1)).toHaveText("Setup");

  await sortButton.click();
  await expect(rows.nth(0).locator("td").nth(0)).toContainText("01");
  await expect(wrapper.locator("thead th").nth(1)).toHaveAttribute("aria-sort", "none");

  await sortButton.click();
  await wrapper.getByRole("button", { name: "Reset table view" }).click();
  await expect(rows.nth(0).locator("td").nth(0)).toContainText("01");
});

test("expands one table into Focus mode and restores the page with Escape", async ({ page }) => {
  await page.goto(fixtureUrl);

  const firstWrapper = page.locator(".github-table-enhancer-scroll").first();
  const table = firstWrapper.locator("table");
  await firstWrapper.getByRole("button", { name: "Wrap" }).click();
  await firstWrapper.getByRole("button", { name: "Expand" }).click();

  await expect(firstWrapper).toHaveAttribute("data-github-table-enhancer-focus-mode", "true");
  await expect(page.locator("body")).toHaveClass(/github-table-enhancer-focus-mode-open/);
  await expect(firstWrapper.locator(".github-table-enhancer-focus-mode-status")).toHaveText(
    "Focus modePressEscto return",
  );
  await expect(firstWrapper.getByRole("button", { name: "Close" })).toBeVisible();
  await expect(table).toHaveAttribute("data-github-table-enhancer-wrapped-columns", "true");

  await firstWrapper.getByRole("button", { name: "Freeze" }).click();
  await firstWrapper.getByLabel("Frozen rows").fill("1");
  await firstWrapper.evaluate((wrapper) => {
    wrapper.scrollTop = 200;
  });
  const controlsBox = await firstWrapper.locator("gte-table-controls").boundingBox();
  const frozenRowBox = await table.locator("thead tr").boundingBox();
  const focusMasks = await firstWrapper.evaluate((wrapper) => {
    const topMaskStyles = getComputedStyle(wrapper, "::before");
    const leftMaskStyles = getComputedStyle(wrapper, "::after");

    return {
      left: {
        backgroundColor: leftMaskStyles.backgroundColor,
        position: leftMaskStyles.position,
        width: leftMaskStyles.width,
      },
      top: {
        backgroundColor: topMaskStyles.backgroundColor,
        height: topMaskStyles.height,
        position: topMaskStyles.position,
      },
    };
  });
  expect(controlsBox).not.toBeNull();
  expect(frozenRowBox).not.toBeNull();
  expect(focusMasks.top.backgroundColor).toBe("rgb(255, 255, 255)");
  expect(Number.parseFloat(focusMasks.top.height)).toBeGreaterThan(16);
  expect(focusMasks.top.position).toBe("fixed");
  expect(focusMasks.left.backgroundColor).toBe("rgb(255, 255, 255)");
  expect(focusMasks.left.position).toBe("fixed");
  expect(focusMasks.left.width).toBe("16px");
  expect(frozenRowBox?.y).toBeGreaterThanOrEqual(
    (controlsBox?.y ?? 0) + (controlsBox?.height ?? 0),
  );

  await page.keyboard.press("Escape");
  await expect(firstWrapper.getByLabel("Frozen rows")).not.toBeVisible();
  await page.keyboard.press("Escape");

  await expect(firstWrapper).not.toHaveAttribute("data-github-table-enhancer-focus-mode", "true");
  await expect(page.locator("body")).not.toHaveClass(/github-table-enhancer-focus-mode-open/);
  await expect(firstWrapper.getByRole("button", { name: "Expand" })).toBeFocused();
  await expect(table).toHaveAttribute("data-github-table-enhancer-wrapped-columns", "true");
});

test("saves freeze defaults and reapplies them after reload", async ({ page }) => {
  await page.goto(fixtureUrl);

  const longTableWrapper = page.locator(".github-table-enhancer-scroll").nth(1);
  await longTableWrapper.getByRole("button", { name: "Freeze" }).click();
  await longTableWrapper.getByLabel("Frozen rows").fill("1");
  await longTableWrapper.getByLabel("Frozen columns").fill("1");
  await longTableWrapper.getByRole("button", { name: "Save default" }).click();
  await expect(longTableWrapper.getByRole("button", { name: "Saved" })).toBeVisible();

  await page.reload();

  const reloadedLongTableWrapper = page.locator(".github-table-enhancer-scroll").nth(1);
  const firstHeaderCell = reloadedLongTableWrapper.locator("th").first();
  await expect(firstHeaderCell).toHaveAttribute("data-github-table-enhancer-sticky", "true");
  await expect(reloadedLongTableWrapper).toHaveAttribute(
    "data-github-table-enhancer-frozen-rows",
    "true",
  );
});
