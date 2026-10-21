import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { expect, fixtureUrl, test } from "./extension-fixture";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDirectory = path.join(repositoryRoot, "docs", "store-assets", "screenshots");

const storeFreezeControlsFixture = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>GitHub Table Enhancer freeze controls fixture</title>
    <style>
      * { box-sizing: border-box; }
      body { background: #fff; color: #1f2328; font: 20px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; }
      .repository-content { padding: 18px 42px 80px; }
      h1 { border-bottom: 1px solid #d0d7de; font-size: 32px; line-height: 1.25; margin: 0 0 20px; padding-bottom: 8px; }
      p { font-size: 22px; margin: 0 0 22px; }
      code { background: #eff2f5; border-radius: 6px; font: 85% ui-monospace, SFMono-Regular, SFMono, Consolas, monospace; padding: 0.2em 0.4em; }
      .markdown-body table { border-collapse: collapse; display: block; margin-bottom: 16px; max-width: 100%; overflow: auto; }
      .markdown-body th, .markdown-body td { border: 1px solid #d0d7de; padding: 7px 18px; text-align: left; white-space: nowrap; }
      .markdown-body th { background: #fff; font-weight: 600; }
      .markdown-body tbody tr:nth-child(even) { background: #f6f8fa; }
    </style>
  </head>
  <body>
    <main class="repository-content markdown-body">
      <h1>Long Table For Frozen Rows</h1>
      <p>Set Frozen rows to <code>1</code> or <code>2</code>. The table wrapper should scroll vertically while the frozen row stays visible.</p>
      <table>
        <thead><tr><th>Step</th><th>Area</th><th>Command Or Check</th><th>Expected Result</th></tr></thead>
        <tbody>
          <tr><td>01</td><td>Setup</td><td>Open this fixture from a GitHub Markdown blob page.</td><td>The Freeze control appears above this table.</td></tr>
          <tr><td>02</td><td>Setup</td><td>Open the Freeze control.</td><td>Rows and Columns inputs are visible, and the Rows input is focused.</td></tr>
          <tr><td>02a</td><td>Keyboard</td><td>Focus the Rows or Columns input, then press Escape.</td><td>The Freeze control panel closes and focus returns to the Freeze button.</td></tr>
          <tr><td>03</td><td>Rows</td><td>Set Rows to <code>1</code>.</td><td>The first row stays visible while scrolling down.</td></tr>
          <tr><td>04</td><td>Rows</td><td>Set Rows to <code>2</code>.</td><td>The first two rows stay visible with a clear separator below the second frozen row.</td></tr>
          <tr><td>05</td><td>Columns</td><td>Set Columns to <code>1</code>.</td><td>The first column stays visible while scrolling horizontally.</td></tr>
          <tr><td>06</td><td>Defaults</td><td>Click Save default.</td><td>The current Rows <code>2</code> and Columns <code>1</code> values are saved.</td></tr>
          <tr><td>07</td><td>Scroll</td><td>Drag the vertical scrollbar near the middle.</td><td>Lower rows become visible without moving the frozen rows.</td></tr>
          <tr><td>08</td><td>Scroll</td><td>Drag the vertical scrollbar near the bottom.</td><td>The last rows can be reached inside the wrapper.</td></tr>
          <tr><td>09</td><td>Scroll</td><td>Drag the horizontal scrollbar away from the left edge.</td><td>Frozen columns remain visible.</td></tr>
          <tr><td>10</td><td>Reset</td><td>Click Reset.</td><td>The wrapper no longer needs to keep frozen rows visible.</td></tr>
        </tbody>
      </table>
    </main>
  </body>
</html>`;

const guideFixture = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Table Enhancer for GitHub guide fixture</title>
    <style>
      * { box-sizing: border-box; }
      body { background: #fff; color: #1f2328; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; }
      header { align-items: center; border-bottom: 1px solid #d0d7de; display: flex; height: 64px; padding: 0 48px; }
      header strong { font-size: 18px; }
      .repository-content { margin: 0 auto; max-width: 1180px; padding: 28px 48px 80px; }
      h1 { font-size: 28px; margin: 0 0 8px; }
      .lead { color: #656d76; font-size: 16px; margin: 0 0 24px; }
      .markdown-body table { border-collapse: collapse; display: block; margin-bottom: 16px; max-width: 100%; overflow: auto; }
      .markdown-body th, .markdown-body td { border: 1px solid #d0d7de; padding: 9px 13px; text-align: left; white-space: nowrap; }
      .markdown-body th { background: #f6f8fa; font-weight: 600; }
    </style>
  </head>
  <body>
    <header><strong>octo-org / release-dashboard</strong></header>
    <main class="repository-content markdown-body">
      <h1>Release compatibility matrix</h1>
      <p class="lead">A wide GitHub Markdown table, made easier to explore.</p>
      <h2>Supported environments</h2>
      <table>
        <thead><tr><th>Product</th><th>Status</th><th>Runtime</th><th>Package manager</th><th>Platform</th><th>Release notes</th></tr></thead>
        <tbody>
          <tr><td>Web application</td><td>Ready</td><td>Node.js 26</td><td>pnpm 11</td><td>Windows / macOS / Linux</td><td>Validated for the July stable release.</td></tr>
          <tr><td>Documentation</td><td>Ready</td><td>Static</td><td>pnpm 11</td><td>GitHub Pages</td><td>Search and navigation updates are included.</td></tr>
          <tr><td>Browser extension</td><td>In review</td><td>Chrome Stable</td><td>Chrome Web Store</td><td>Windows / macOS / Linux</td><td>Store review is currently in progress.</td></tr>
          <tr><td>Developer preview</td><td>Testing</td><td>Node.js 27</td><td>pnpm 11</td><td>Linux</td><td>Experimental runtime compatibility checks.</td></tr>
          <tr><td>Legacy integration</td><td>Archived</td><td>Node.js 20</td><td>npm 10</td><td>Windows</td><td>Maintained for critical fixes only.</td></tr>
          <tr><td>Automation runner</td><td>Ready</td><td>Node.js 26</td><td>pnpm 11</td><td>GitHub Actions</td><td>Build, test, and packaging workflows passed.</td></tr>
        </tbody>
      </table>
    </main>
  </body>
</html>`;

async function screenshot(page: Page, name: string): Promise<void> {
  const screenshotPath = path.join(screenshotDirectory, name);
  const candidate = await page.screenshot({ fullPage: true });

  let existing: Buffer;
  try {
    existing = await fs.readFile(screenshotPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    await fs.writeFile(screenshotPath, candidate);
    return;
  }

  if (existing.equals(candidate)) {
    return;
  }

  const hasVisualDifference = await page.evaluate(
    async ({ existingPng, candidatePng }) => {
      const decodePng = async (png: string) => {
        const image = new Image();
        image.src = `data:image/png;base64,${png}`;
        await image.decode();

        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Unable to create a canvas context for screenshot comparison.");
        }

        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height);
      };

      const [existing, candidate] = await Promise.all([
        decodePng(existingPng),
        decodePng(candidatePng),
      ]);

      if (existing.width !== candidate.width || existing.height !== candidate.height) {
        return true;
      }

      return existing.data.some((value, index) => value !== candidate.data[index]);
    },
    {
      existingPng: existing.toString("base64"),
      candidatePng: candidate.toString("base64"),
    },
  );

  if (hasVisualDifference) {
    await fs.writeFile(screenshotPath, candidate);
  }
}

test.beforeEach(async ({ page }) => {
  await fs.mkdir(screenshotDirectory, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 800 });
});

async function loadFixture(page: Page, body: string): Promise<void> {
  await page.route(fixtureUrl, (route) => route.fulfill({ body, contentType: "text/html" }));
  await page.goto(fixtureUrl);
  await expect(page.locator(".github-table-enhancer-scroll")).toBeVisible();
}

test("captures the user guide screenshots", async ({ page }) => {
  await loadFixture(page, guideFixture);

  const wrapper = page.locator(".github-table-enhancer-scroll");
  const table = wrapper.locator("table");

  await screenshot(page, "user-guide-overview.png");

  await wrapper.getByRole("button", { name: "Select rows", exact: true }).click();
  await wrapper.getByRole("checkbox", { name: "Select all visible rows" }).uncheck();
  await table.locator("tbody tr").first().getByRole("checkbox").check();
  await screenshot(page, "user-guide-row-selection.png");
  await wrapper.getByRole("button", { name: "Cancel", exact: true }).click();

  await wrapper.getByRole("button", { name: "Freeze" }).click();
  await wrapper.getByLabel("Frozen rows").fill("1");
  await wrapper.getByLabel("Frozen columns").fill("1");
  await screenshot(page, "user-guide-freeze.png");
  await page.keyboard.press("Escape");

  await wrapper.getByRole("button", { name: "Filter" }).click();
  await wrapper.getByLabel("Filter rows").fill("ready");
  await screenshot(page, "user-guide-filter.png");
  await wrapper.getByLabel("Filter rows").fill("");
  await page.keyboard.press("Escape");

  await table.locator("th").nth(2).hover();
  await table.getByRole("button", { name: "Hide column 3" }).click();
  await screenshot(page, "user-guide-hide-and-restore.png");
  await wrapper.getByRole("button", { name: "Show hidden" }).click();

  await wrapper.getByRole("button", { name: "Fit" }).click();
  await screenshot(page, "user-guide-fit-and-wrap.png");

  await wrapper.getByRole("button", { name: "Expand" }).click();
  await screenshot(page, "user-guide-focus-mode.png");
});

test("captures the store freeze controls screenshot", async ({ page }) => {
  await loadFixture(page, storeFreezeControlsFixture);

  const wrapper = page.locator(".github-table-enhancer-scroll");
  await wrapper.getByRole("button", { name: "Freeze" }).click();
  await wrapper.getByLabel("Frozen rows").fill("1");
  await wrapper.getByLabel("Frozen columns").fill("1");
  await screenshot(page, "github-table-freeze-controls-1280x800.png");
});
