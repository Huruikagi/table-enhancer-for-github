import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { expect, fixtureUrl, test } from "./extension-fixture";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDirectory = path.join(repositoryRoot, "docs", "store-assets", "screenshots");

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
  await page.screenshot({ path: path.join(screenshotDirectory, name), fullPage: true });
}

test.beforeEach(async ({ page }) => {
  await fs.mkdir(screenshotDirectory, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route(fixtureUrl, (route) =>
    route.fulfill({ body: guideFixture, contentType: "text/html" }),
  );
  await page.goto(fixtureUrl);
  await expect(page.locator(".github-table-enhancer-scroll")).toBeVisible();
});

test("captures the user guide screenshots", async ({ page }) => {
  const wrapper = page.locator(".github-table-enhancer-scroll");
  const table = wrapper.locator("table");

  await screenshot(page, "user-guide-overview.png");

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
