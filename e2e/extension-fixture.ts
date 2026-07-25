import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext, Page } from "@playwright/test";
import { test as base, chromium } from "@playwright/test";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionPath = path.join(repositoryRoot, "dist");

export const fixtureUrl =
  "https://github.com/owner/github-table-enhancer/blob/main/docs/e2e-table-fixture.md";

type ExtensionFixtures = {
  context: BrowserContext;
  page: Page;
};

type ExtensionOptions = {
  locale: string;
};

export const test = base.extend<ExtensionFixtures & ExtensionOptions>({
  locale: ["en-US", { option: true }],

  context: async ({ browserName, locale }, use, testInfo) => {
    if (browserName !== "chromium") {
      throw new Error("Chrome extension E2E tests must run with Playwright's Chromium browser.");
    }

    const context = await chromium.launchPersistentContext(testInfo.outputPath("profile"), {
      channel: "chromium",
      args: [
        `--lang=${locale}`,
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    await use(context);
    await context.close();
  },

  page: async ({ context }, use) => {
    const page = await context.newPage();

    await use(page);
    await page.close();
  },
});

export { expect } from "@playwright/test";
