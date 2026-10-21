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

// Matches GitHub's rendered frontmatter: a key/value table with nested mappings
// and sequences, wrapped once in markdown-accessiblity-table.
const nestedFrontmatter = `<markdown-accessiblity-table data-testid="frontmatter">
  <table><tbody>
    <tr><th>title</th><td>E2E Table Fixture</td></tr>
    <tr><th>metadata</th><td>
      <table><thead><tr><th>environments</th></tr></thead><tbody><tr><td>
        <table><tbody><tr><td><div dir="auto">Chrome</div></td></tr></tbody></table>
      </td></tr></tbody></table>
    </td></tr>
  </tbody></table>
</markdown-accessiblity-table>`;

for (const timing of ["initial", "dynamic"] as const) {
  test(`keeps ${timing} nested frontmatter native while enhancing body tables`, async ({
    page,
  }) => {
    if (timing === "initial") {
      await page.route(fixtureUrl, (route) =>
        route.fulfill({
          body: githubBlobFixture.replace(
            '<article class="markdown-body">',
            `<article class="markdown-body">${nestedFrontmatter}`,
          ),
          contentType: "text/html",
        }),
      );
    }

    await page.goto(fixtureUrl);
    const wrappers = page.locator(".github-table-enhancer-scroll");
    await expect(wrappers).toHaveCount(2);

    if (timing === "dynamic") {
      await page.locator(".markdown-body").evaluate((article, markup) => {
        article.insertAdjacentHTML("afterbegin", markup);
      }, nestedFrontmatter);
    }

    const metadata = page.getByTestId("frontmatter");
    await expect(metadata.locator("table")).toHaveCount(3);
    await expect(metadata.getByText("Chrome", { exact: true })).toBeVisible();

    // Exercise regular controls and give the page observer time to process the
    // inserted group before asserting that the metadata DOM is still pristine.
    await wrappers.first().getByRole("button", { name: "Freeze", exact: true }).click();
    await expect(wrappers.first().getByLabel("Frozen rows")).toBeVisible();
    expect(
      await metadata.evaluate((element, markup) => {
        const expected = new DOMParser().parseFromString(markup, "text/html");
        return element.outerHTML === expected.body.firstElementChild?.outerHTML;
      }, nestedFrontmatter),
    ).toBe(true);
    await expect(wrappers).toHaveCount(2);
  });
}

const localizationCases = [
  {
    filter: "フィルター",
    filterRows: "フィルター",
    freeze: "固定",
    locale: "ja",
    selectRows: "行を選択",
    selectAllRows: "表示中の行をすべて選択",
    name: "Japanese",
    placeholder: "条件...",
    sortColumnTwo: "2列目で並べ替え",
  },
  {
    filter: "筛选",
    filterRows: "筛选行",
    freeze: "冻结",
    locale: "zh-CN",
    selectRows: "选择行",
    selectAllRows: "选择所有可见行",
    name: "Simplified Chinese",
    placeholder: "筛选行...",
    sortColumnTwo: "按第 2 列排序",
  },
  {
    filter: "필터",
    filterRows: "행 필터링",
    freeze: "고정",
    locale: "ko",
    selectRows: "행 선택",
    selectAllRows: "표시된 모든 행 선택",
    name: "Korean",
    placeholder: "행 필터링...",
    sortColumnTwo: "2번째 열 기준 정렬",
  },
  {
    filter: "Filtrar",
    filterRows: "Filtrar linhas",
    freeze: "Fixar",
    locale: "pt-BR",
    selectRows: "Selecionar linhas",
    selectAllRows: "Selecionar todas as linhas visíveis",
    name: "Brazilian Portuguese",
    placeholder: "Filtrar linhas...",
    sortColumnTwo: "Ordenar pela coluna 2",
  },
  {
    filter: "Filtrar",
    filterRows: "Filtrar filas",
    freeze: "Fijar",
    locale: "es",
    selectRows: "Seleccionar filas",
    selectAllRows: "Seleccionar todas las filas visibles",
    name: "Spanish",
    placeholder: "Filtrar filas...",
    sortColumnTwo: "Ordenar por columna 2",
  },
] as const;

for (const localization of localizationCases) {
  test.describe(`${localization.name} localization`, () => {
    test.use({ locale: localization.locale });

    test("localizes browser-visible controls", async ({ page }) => {
      await page.goto(fixtureUrl);

      const wrapper = page.locator(".github-table-enhancer-scroll").first();
      await expect(wrapper.getByRole("button", { name: localization.freeze })).toBeVisible();
      await expect(wrapper.getByRole("button", { name: localization.filter })).toHaveAttribute(
        "title",
        localization.filterRows,
      );
      await expect(
        wrapper.getByRole("button", { name: localization.sortColumnTwo }),
      ).toBeAttached();

      await wrapper.getByRole("button", { name: localization.filter }).click();
      await expect(
        wrapper.getByRole("searchbox", { name: localization.filterRows }),
      ).toHaveAttribute("placeholder", localization.placeholder);
      await wrapper.getByRole("button", { name: localization.selectRows, exact: true }).click();
      await expect(
        wrapper.getByRole("checkbox", { name: localization.selectAllRows }),
      ).toBeChecked();
      if (localization.locale === "ja") {
        await expect(wrapper.locator(".github-table-enhancer-selection-actions")).toContainText(
          "2行中2行を選択",
        );
        await expect(wrapper.getByRole("button", { name: "選んだ行を表示" })).toBeVisible();
      }
    });
  });
}

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

test("keeps an expanded filter panel visible with a capped width", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 720 });
  await page.goto(fixtureUrl);

  const wrapper = page.locator(".github-table-enhancer-scroll").nth(1);
  await wrapper.getByRole("button", { name: "Filter" }).click();
  await wrapper.getByLabel("Filter rows").fill("3");

  const panel = wrapper.locator(".github-table-enhancer-controls-panel");
  await expect(panel).toBeVisible();

  const inputBox = await wrapper.getByLabel("Filter rows").boundingBox();
  const regularExpressionButtonBox = await wrapper
    .getByRole("button", { name: "Use regular expression" })
    .boundingBox();
  const filterButtonBox = await wrapper
    .getByRole("button", { name: "Filter", exact: true })
    .boundingBox();
  const panelBox = await panel.boundingBox();
  const wrapperBox = await wrapper.boundingBox();
  if (!inputBox || !regularExpressionButtonBox || !filterButtonBox || !panelBox || !wrapperBox) {
    throw new Error("Expected the Filter controls and panel to have layout boxes");
  }
  const inputCenterY = inputBox.y + inputBox.height / 2;
  const regularExpressionButtonCenterY =
    regularExpressionButtonBox.y + regularExpressionButtonBox.height / 2;
  expect(Math.abs(regularExpressionButtonCenterY - inputCenterY)).toBeLessThanOrEqual(1);
  expect(panelBox.y).toBeGreaterThanOrEqual(filterButtonBox.y + filterButtonBox.height);
  expect(panelBox.width).toBeLessThanOrEqual(360);
  expect(panelBox.x).toBeLessThanOrEqual(filterButtonBox.x);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(wrapperBox.x + wrapperBox.width);
});

test("selects visible rows with all, mixed, cancel, and apply states", async ({
  page,
}, testInfo) => {
  await page.goto(fixtureUrl);
  const wrapper = page.locator(".github-table-enhancer-scroll").nth(1);
  const bodyRows = wrapper.locator("tbody tr");
  await wrapper.getByRole("button", { name: "Select rows", exact: true }).click();
  const all = wrapper.getByRole("checkbox", { name: "Select all visible rows" });
  await expect(all).toBeChecked();
  await expect(all).toBeFocused();
  await all.uncheck();
  await bodyRows.nth(1).getByRole("checkbox").check();
  await bodyRows.nth(3).getByRole("checkbox").check();
  await expect(all).toBeChecked({ indeterminate: true });
  await expect(wrapper.locator("tbody tr:visible")).toHaveCount(4);
  await expect(wrapper.locator(".github-table-enhancer-selection-actions")).toContainText(
    "2 of 4 rows selected",
  );
  await wrapper.screenshot({ path: testInfo.outputPath("row-selection.png") });
  await wrapper.getByRole("button", { name: "Show selected rows" }).click();
  await expect(wrapper.locator("tbody tr:visible")).toHaveCount(2);
  await expect(bodyRows.nth(1)).toBeVisible();
  await expect(bodyRows.nth(3)).toBeVisible();
  await expect(wrapper.locator("thead")).toBeVisible();
  await expect(wrapper.getByRole("checkbox")).toHaveCount(0);
  await expect(wrapper.getByRole("button", { name: "Select rows", exact: true })).toBeFocused();
  await wrapper.getByRole("button", { name: "Show hidden", exact: true }).click();
  await wrapper.getByRole("button", { name: "Select rows", exact: true }).click();
  await all.uncheck();
  await wrapper.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(wrapper.locator("tbody tr:visible")).toHaveCount(4);
  await wrapper.getByRole("button", { name: "Select rows", exact: true }).click();
  await expect(all).toBeChecked();
  await all.uncheck();
  await all.press("Space");
  await expect(all).toBeChecked();
  await all.press("Escape");
  await expect(wrapper.getByRole("checkbox")).toHaveCount(0);
  await expect(wrapper.locator("tbody tr:visible")).toHaveCount(4);
  await expect(
    page.locator(".github-table-enhancer-scroll").first().getByRole("checkbox"),
  ).toHaveCount(0);
});

test("keeps row selection usable with a hidden first column, freezing, sorting, and Focus mode", async ({
  page,
}) => {
  await page.goto(fixtureUrl);
  const wrapper = page.locator(".github-table-enhancer-scroll").nth(1);
  await wrapper.getByRole("button", { name: "Expand", exact: true }).click();
  await wrapper.getByRole("button", { name: "Freeze", exact: true }).click();
  await wrapper.getByLabel("Frozen rows").fill("1");
  await wrapper.getByLabel("Frozen columns").fill("1");
  await wrapper.getByRole("button", { name: "Freeze", exact: true }).click();
  await wrapper.locator("th").first().hover();
  await wrapper.getByRole("button", { name: "Hide column 1", exact: true }).click();
  await wrapper.getByRole("button", { name: "Select rows", exact: true }).click();
  const originalRow = wrapper
    .locator("tbody tr")
    .filter({ hasText: "The rebuilt content script is active." });
  await expect(originalRow.locator("td").nth(1).getByRole("checkbox")).toBeVisible();
  await originalRow.getByRole("checkbox").uncheck();
  await wrapper.locator("th").nth(1).hover();
  await wrapper.getByRole("button", { name: "Sort by column 2", exact: true }).click();
  await expect(originalRow.getByRole("checkbox")).not.toBeChecked();
  await wrapper.getByRole("button", { name: "Show selected rows" }).click();
  await expect(originalRow).toBeHidden();
  await expect(wrapper.locator("tbody tr:visible")).toHaveCount(3);
  await expect(wrapper.locator("th").nth(1)).toHaveAttribute(
    "data-github-table-enhancer-sticky",
    "true",
  );
  await wrapper.getByRole("button", { name: "Select rows", exact: true }).click();
  await wrapper.getByRole("checkbox", { name: "Select all visible rows" }).press("Escape");
  await expect(wrapper).toHaveAttribute("data-github-table-enhancer-focus-mode", "true");
  await wrapper.getByRole("button", { name: "Select rows", exact: true }).press("Escape");
  await expect(wrapper).not.toHaveAttribute("data-github-table-enhancer-focus-mode", "true");
});

for (const focusMode of [false, true]) {
  test(`keeps narrow header actions separate in ${focusMode ? "Focus" : "normal"} mode`, async ({
    page,
  }, testInfo) => {
    await page.goto(fixtureUrl);
    const wrapper = page.locator(".github-table-enhancer-scroll").nth(1);
    if (focusMode) await wrapper.getByRole("button", { name: "Expand", exact: true }).click();
    await wrapper.getByRole("button", { name: "Freeze", exact: true }).click();
    await wrapper.getByLabel("Frozen rows").fill("1");
    await wrapper.getByLabel("Frozen columns").fill("1");
    await wrapper.getByRole("button", { name: "Freeze", exact: true }).click();
    const header = wrapper.locator("th").first();
    const sort = wrapper.getByRole("button", { name: "Sort by column 1", exact: true });
    const hide = wrapper.getByRole("button", { name: "Hide column 1", exact: true });
    const resize = header.locator(".github-table-enhancer-column-resize-handle");

    for (const stage of ["natural", "fit", "minimum"]) {
      if (stage === "fit") await wrapper.getByRole("button", { name: "Fit", exact: true }).click();
      if (stage === "minimum") {
        const handleBox = await resize.boundingBox();
        const headerBox = await header.boundingBox();
        if (!handleBox || !headerBox) throw new Error("Expected a visible resize handle");
        const x = handleBox.x + 1;
        const y = handleBox.y + handleBox.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x - headerBox.width, y, { steps: 5 });
        await page.mouse.up();
        await expect(wrapper.locator("col").first()).toHaveCSS("width", "48px");
      }

      await header.hover();
      const boxes = await Promise.all([
        header.boundingBox(),
        sort.boundingBox(),
        hide.boundingBox(),
        resize.boundingBox(),
      ]);
      const [cellBox, sortBox, hideBox, resizeBox] = boxes;
      if (!cellBox || !sortBox || !hideBox || !resizeBox)
        throw new Error("Expected visible header controls");
      expect(sortBox.x).toBeGreaterThanOrEqual(cellBox.x);
      expect(sortBox.x + sortBox.width).toBeLessThanOrEqual(hideBox.x);
      expect(hideBox.x + hideBox.width).toBeLessThanOrEqual(resizeBox.x);
      expect(hideBox.y + hideBox.height).toBeLessThanOrEqual(cellBox.y + cellBox.height);
      for (const direction of ["ascending", "descending", "none"]) {
        await sort.click();
        await expect(header).toHaveAttribute("aria-sort", direction);
      }
      if (stage === "minimum") {
        expect(cellBox.width).toBeLessThanOrEqual(49);
        await wrapper.getByRole("button", { name: "Select rows", exact: true }).click();
        const all = wrapper.getByRole("checkbox", { name: "Select all visible rows" });
        await all.uncheck();
        await all.check();
        await header.hover();
        await wrapper.screenshot({ path: testInfo.outputPath("narrow-header.png") });
        await wrapper.getByRole("button", { name: "Cancel", exact: true }).click();
      }
      await header.hover();
      await hide.click();
      await expect(header).toBeHidden();
      await wrapper.getByRole("button", { name: "Show hidden", exact: true }).click();
      await expect(header).toBeVisible();
    }
    await wrapper.getByRole("button", { name: "Reset table view", exact: true }).click();
    // Empty headings must still reserve enough width for both actions in intrinsic layout.
    await header.evaluate((cell) => {
      for (const node of Array.from(cell.childNodes))
        if (node.nodeType === Node.TEXT_NODE) node.textContent = "";
    });
    await header.hover();
    const emptyBox = await header.boundingBox();
    const sortBox = await sort.boundingBox();
    if (!emptyBox || !sortBox) throw new Error("Expected an empty heading with controls");
    expect(emptyBox.width).toBeGreaterThanOrEqual(48);
    expect(sortBox.x).toBeGreaterThanOrEqual(emptyBox.x);
    await sort.click();
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    await hide.click();
    await expect(header).toBeHidden();
  });
}

test("explains why a filter leaves no visible rows", async ({ page }) => {
  await page.goto(fixtureUrl);

  const wrapper = page.locator(".github-table-enhancer-scroll").nth(1);
  const filterInput = wrapper.getByLabel("Filter rows");

  await wrapper.getByRole("button", { name: "Filter" }).click();
  await filterInput.fill("does-not-exist");
  await expect(wrapper.getByRole("status")).toContainText("No rows match this filter.");
  await expect(wrapper.locator(".github-table-enhancer-filter-summary")).toContainText(
    "0 of 4 rows",
  );

  await filterInput.fill("rebuilt content script is active");
  const matchingRow = wrapper.locator("tbody tr").nth(2);
  await wrapper.getByRole("button", { name: "Select rows", exact: true }).click();
  await matchingRow.getByRole("checkbox").uncheck();
  await wrapper.getByRole("button", { name: "Show selected rows" }).click();

  await expect(wrapper.getByRole("status")).toContainText("1 matching row is hidden.");
  await wrapper.getByRole("status").getByRole("button", { name: "Show hidden" }).click();
  await expect(wrapper.getByRole("status")).toHaveCount(0);
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

  await expect(sortButton).toHaveCSS("opacity", "0");
  await wrapper.locator("thead th").nth(1).hover();
  await expect(sortButton).toHaveCSS("opacity", "0.65");
  await sortButton.click();
  await expect(rows.nth(0).locator("td").nth(1)).toHaveText("Filter");
  await expect(wrapper.locator("thead th").nth(1)).toHaveAttribute("aria-sort", "ascending");
  await expect(sortButton).toHaveCSS("opacity", "1");

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
