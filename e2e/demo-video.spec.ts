import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { chromium, expect, type Locator, type Page, test } from "@playwright/test";
import { fixtureUrl } from "./extension-fixture";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionPath = path.join(repositoryRoot, "dist");
const iconPath = path.join(repositoryRoot, "public", "icons", "icon128.png");
const videoDirectory = path.join(repositoryRoot, "docs", "store-assets", "videos");
const videoPath = path.join(videoDirectory, "github-table-enhancer-demo.webm");
const mp4Path = path.join(videoDirectory, "github-table-enhancer-demo.mp4");

const frontmatterLines = [
  "---",
  "title: Release compatibility matrix",
  "owner: platform-team",
  "tags: [release, compatibility, q3]",
  "reviewed: 2026-10-01",
  "---",
];

const frontmatterTable = `<table><tbody><tr><th>title</th><td>Release compatibility matrix</td></tr><tr><th>owner</th><td>platform-team</td></tr><tr><th>tags</th><td><table><tbody><tr><td>release</td><td>compatibility</td><td>q3</td></tr></tbody></table></td></tr><tr><th>reviewed</th><td>2026-10-01</td></tr></tbody></table>`;

const rows = [
  [
    "Web application",
    "Ready",
    "Node.js 26",
    "pnpm 11",
    "Windows / macOS / Linux",
    "2026-09-30",
    "@mona",
    "Validated for the July stable release and the autumn patch train.",
  ],
  [
    "Documentation",
    "Ready",
    "Static",
    "pnpm 11",
    "GitHub Pages",
    "2026-09-12",
    "@hubot",
    "Search and navigation updates are included in this release.",
  ],
  [
    "Browser extension",
    "In review",
    "Chrome Stable",
    "Chrome Web Store",
    "Windows / macOS / Linux",
    "2026-10-04",
    "@octocat",
    "Store review is currently in progress for the new controls.",
  ],
  [
    "Developer preview",
    "Testing",
    "Node.js 27",
    "pnpm 11",
    "Linux",
    "2026-10-11",
    "@mona",
    "Experimental runtime compatibility checks are running nightly.",
  ],
  [
    "Legacy integration",
    "Archived",
    "Node.js 20",
    "npm 10",
    "Windows",
    "2025-12-01",
    "@hubot",
    "Maintained for critical security fixes only until end of life.",
  ],
  [
    "Automation runner",
    "Ready",
    "Node.js 26",
    "pnpm 11",
    "GitHub Actions",
    "2026-09-28",
    "@octocat",
    "Build, test, and packaging workflows passed on every platform.",
  ],
  [
    "CLI tooling",
    "Testing",
    "Node.js 26",
    "pnpm 11",
    "macOS / Linux",
    "2026-10-09",
    "@mona",
    "Shell completion and config migration are being verified.",
  ],
  [
    "Mobile companion",
    "In review",
    "React Native",
    "pnpm 11",
    "iOS / Android",
    "2026-10-02",
    "@hubot",
    "Accessibility review feedback is being addressed.",
  ],
  [
    "Analytics service",
    "Ready",
    "Node.js 26",
    "pnpm 11",
    "Kubernetes",
    "2026-09-21",
    "@octocat",
    "Dashboards and alerting rules were migrated successfully.",
  ],
  [
    "Payments gateway",
    "Blocked",
    "Node.js 24",
    "pnpm 10",
    "Kubernetes",
    "2026-08-30",
    "@mona",
    "Waiting on the upstream SDK upgrade before certification.",
  ],
  [
    "Search indexer",
    "Ready",
    "Node.js 26",
    "pnpm 11",
    "Linux",
    "2026-09-18",
    "@hubot",
    "Re-indexing finished with no regressions detected.",
  ],
  [
    "Notification hub",
    "Testing",
    "Node.js 26",
    "pnpm 11",
    "Serverless",
    "2026-10-07",
    "@octocat",
    "Load tests are scheduled before the general availability.",
  ],
];

const headers = [
  "Product",
  "Status",
  "Runtime",
  "Package manager",
  "Platform",
  "Last verified",
  "Owner",
  "Release notes",
];

const tableHtml = `<table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows
  .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
  .join("")}</tbody></table>`;

const articleHtml = `<article class="markdown-body"><markdown-accessiblity-table>${frontmatterTable}</markdown-accessiblity-table><h1>Release compatibility matrix</h1><p class="lead">Every product, runtime, and platform we ship to, in one wide Markdown table.</p><h2>Supported environments</h2>${tableHtml}</article>`;

function embeddedData(): string {
  const refInfo = { name: "main", currentOid: "a".repeat(40) };
  const filePath = "docs/e2e-table-fixture.md";
  const data = {
    payload: {
      codeViewLayoutRoute: {
        repo: { ownerLogin: "owner", name: "github-table-enhancer" },
        path: filePath,
        refInfo,
      },
      codeViewBlobLayoutRoute: { path: filePath, refInfo },
      "codeViewBlobLayoutRoute.StyledBlob": {
        rawLines: [...frontmatterLines, "", "# Release compatibility matrix"],
      },
      codeViewBlobRoute: { richText: articleHtml },
    },
  };
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

function demoFixture(iconDataUrl: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Table Enhancer for GitHub</title>
    <style>
      :root { --bgColor-default: #fff; --bgColor-muted: #f6f8fa; --fgColor-default: #1f2328; --fgColor-muted: #59636e; --borderColor-default: #d1d9e0; }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body { background: #fff; color: #1f2328; font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif; margin: 0; }
      header { align-items: center; background: #f6f8fa; border-bottom: 1px solid #d1d9e0; display: flex; gap: 10px; height: 56px; padding: 0 40px; }
      header svg { fill: #1f2328; }
      header span { color: #59636e; font-size: 16px; }
      header strong { font-size: 16px; }
      .file-bar { align-items: center; border: 1px solid #d1d9e0; border-bottom: 0; border-radius: 6px 6px 0 0; display: flex; font-weight: 600; gap: 8px; margin: 20px auto 0; max-width: 1200px; padding: 10px 16px; background: #f6f8fa; }
      .file-bar code { font: 13px ui-monospace, SFMono-Regular, Consolas, monospace; }
      .repository-content { border: 1px solid #d1d9e0; border-radius: 0 0 6px 6px; margin: 0 auto 100vh; max-width: 1200px; padding: 8px 32px 40px; }
      .markdown-body h1 { border-bottom: 1px solid #d1d9e0; font-size: 28px; margin: 16px 0 8px; padding-bottom: 6px; }
      .markdown-body h2 { font-size: 20px; margin: 20px 0 4px; }
      .lead { color: #59636e; font-size: 16px; margin: 0 0 8px; }
      .markdown-body table { border-collapse: collapse; display: block; margin-bottom: 16px; max-width: 100%; overflow: auto; }
      .markdown-body th, .markdown-body td { border: 1px solid #d1d9e0; padding: 6px 14px; text-align: left; white-space: nowrap; }
      .markdown-body th { background: #f6f8fa; font-weight: 600; }
      .markdown-body tbody tr:nth-child(even) { background: #f6f8fa; }
      .markdown-body dl { padding: 0; } .markdown-body dl dt { font-style: italic; font-weight: 600; margin-top: 16px; padding: 0; }
      .markdown-body dl dd { margin-bottom: 16px; padding: 0 16px; }

      #demo-cursor { height: 26px; left: 0; pointer-events: none; position: fixed; top: 0; transform: translate(-100px, -100px); width: 26px; z-index: 2147483647; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
      #demo-ripple { border: 3px solid #0969da; border-radius: 50%; height: 36px; left: 0; opacity: 0; pointer-events: none; position: fixed; top: 0; width: 36px; z-index: 2147483647; }
      #demo-ripple[data-active="true"] { animation: demo-ripple .5s ease-out; }
      @keyframes demo-ripple { from { opacity: .9; transform: var(--ripple-at) scale(.3); } to { opacity: 0; transform: var(--ripple-at) scale(1.4); } }

      #demo-caption { align-items: center; background: rgba(13, 17, 23, .94); border-radius: 14px; bottom: 28px; box-shadow: 0 12px 32px rgba(0,0,0,.28); color: #fff; display: flex; gap: 16px; left: 50%; opacity: 0; padding: 14px 24px 14px 16px; pointer-events: none; position: fixed; transform: translate(-50%, 16px); transition: opacity .3s, transform .3s; z-index: 2147483647; }
      #demo-caption[data-visible="true"] { opacity: 1; transform: translate(-50%, 0); }
      #demo-caption .step { background: linear-gradient(135deg, #2f81f7, #8957e5); border-radius: 9px; font: 700 15px/1 ui-monospace, SFMono-Regular, Consolas, monospace; padding: 9px 10px; }
      #demo-caption .title { font-size: 22px; font-weight: 650; line-height: 1.2; }
      #demo-caption .detail { color: #9198a1; font-size: 15px; margin-top: 2px; }

      #demo-card { align-items: center; background: radial-gradient(circle at 30% 20%, #1f3a68 0%, #0d1117 55%), #0d1117; color: #fff; display: flex; flex-direction: column; inset: 0; justify-content: center; opacity: 0; pointer-events: none; position: fixed; text-align: center; transition: opacity .6s; z-index: 2147483647; }
      #demo-card[data-visible="true"] { opacity: 1; }
      #demo-card img { border-radius: 24px; height: 112px; margin-bottom: 28px; width: 112px; box-shadow: 0 16px 48px rgba(47,129,247,.35); }
      #demo-card h1 { font-size: 54px; letter-spacing: -.02em; margin: 0; }
      #demo-card p { color: #9198a1; font-size: 24px; margin: 14px 0 0; }
      #demo-card .chips { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 30px; max-width: 900px; }
      #demo-card .chips span { border: 1px solid #3d444d; border-radius: 999px; color: #e6edf3; font-size: 17px; padding: 6px 16px; }
      #demo-card .cta { background: #238636; border-radius: 10px; color: #fff; font-size: 22px; font-weight: 650; margin-top: 34px; padding: 14px 28px; }
      #demo-card .note { font-size: 15px; margin-top: 18px; }
    </style>
  </head>
  <body>
    <header>
      <svg height="28" viewBox="0 0 16 16" width="28" aria-hidden="true"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path></svg>
      <span>octo-org /</span><strong>release-dashboard</strong>
    </header>
    <div class="file-bar"><code>docs/compatibility-matrix.md</code></div>
    <main class="repository-content">
      <react-app>
        <script type="application/json" data-target="react-app.embeddedData">${embeddedData()}</script>
        ${articleHtml}
      </react-app>
    </main>

    <svg id="demo-cursor" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2.5 19.5 13l-7 1.2 4 7.3-2.6 1.4-4-7.4L4.8 20z" fill="#fff" stroke="#1f2328" stroke-width="1.4" stroke-linejoin="round"/></svg>
    <div id="demo-ripple" aria-hidden="true"></div>
    <div id="demo-caption" aria-hidden="true"><span class="step"></span><div><div class="title"></div><div class="detail"></div></div></div>
    <div id="demo-card" aria-hidden="true" data-visible="true"></div>

    <script>
      const cursor = document.getElementById("demo-cursor");
      const ripple = document.getElementById("demo-ripple");
      document.addEventListener("mousemove", (event) => {
        cursor.style.transform = "translate(" + (event.clientX - 4) + "px, " + (event.clientY - 2) + "px)";
      }, true);
      document.addEventListener("mousedown", (event) => {
        ripple.style.setProperty("--ripple-at", "translate(" + (event.clientX - 18) + "px, " + (event.clientY - 18) + "px)");
        ripple.dataset.active = "false";
        void ripple.offsetWidth;
        ripple.dataset.active = "true";
      }, true);
      window.demoCards = {
        intro: '<img src="${iconDataUrl}" alt=""><h1>Table Enhancer for GitHub</h1><p>Wide Markdown tables, finally easy to read.</p>',
        outro: '<img src="${iconDataUrl}" alt=""><h1>Table Enhancer for GitHub</h1><p>Review wide tables in GitHub Markdown previews with less scrolling.</p>' +
          '<div class="chips"><span>Freeze</span><span>Sort</span><span>Filter</span><span>Select rows</span><span>Hide columns</span><span>Resize</span><span>Fit &amp; Wrap</span><span>Copy as Markdown / CSV / TSV</span><span>Focus mode</span><span>Frontmatter</span></div>' +
          '<div class="cta">Free on the Chrome Web Store</div><p class="note">Open source · No extra network requests · Unofficial, not affiliated with GitHub</p>',
      };
      document.getElementById("demo-card").innerHTML = window.demoCards.intro;
    </script>
  </body>
</html>`;
}

async function pause(page: Page, milliseconds = 700): Promise<void> {
  await page.waitForTimeout(milliseconds);
}

let stepNumber = 0;
const totalSteps = 12;

async function caption(page: Page, title: string, detail: string): Promise<void> {
  stepNumber += 1;
  await page.locator("#demo-caption").evaluate(
    (element, { step, title, detail }) => {
      const caption = element as HTMLElement;
      caption.dataset.visible = "false";
      (caption.querySelector(".step") as HTMLElement).textContent = step;
      (caption.querySelector(".title") as HTMLElement).textContent = title;
      (caption.querySelector(".detail") as HTMLElement).textContent = detail;
      requestAnimationFrame(() => {
        caption.dataset.visible = "true";
      });
    },
    { step: `${String(stepNumber).padStart(2, "0")}/${totalSteps}`, title, detail },
  );
  await pause(page, 900);
}

async function hideCaption(page: Page): Promise<void> {
  await page.locator("#demo-caption").evaluate((element) => {
    (element as HTMLElement).dataset.visible = "false";
  });
  await pause(page, 350);
}

async function card(page: Page, name: "intro" | "outro" | null): Promise<void> {
  await page.locator("#demo-card").evaluate((element, value) => {
    const card = element as HTMLElement;
    if (value) {
      card.innerHTML = (window as unknown as { demoCards: Record<string, string> }).demoCards[
        value
      ];
    }
    card.dataset.visible = value ? "true" : "false";
  }, name);
  await pause(page, 700);
}

let pointer = { x: 640, y: 360 };

async function moveTo(page: Page, x: number, y: number, steps = 18): Promise<void> {
  await page.mouse.move(x, y, { steps });
  pointer = { x, y };
}

async function center(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Expected a visible element for the demo pointer.");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function hover(page: Page, locator: Locator, steps = 18): Promise<void> {
  const target = await center(locator);
  await moveTo(page, target.x, target.y, steps);
}

async function click(page: Page, locator: Locator, after = 700): Promise<void> {
  await hover(page, locator);
  await pause(page, 200);
  await page.mouse.click(pointer.x, pointer.y);
  await pause(page, after);
}

async function scrollWrapper(
  page: Page,
  wrapper: Locator,
  left: number,
  top: number,
  wait = 1_100,
): Promise<void> {
  await wrapper.evaluate(
    (element, position) => element.scrollTo({ ...position, behavior: "smooth" }),
    { left, top },
  );
  await pause(page, wait);
}

async function scrollPageTo(page: Page, locator: Locator, offset: number): Promise<void> {
  await locator.evaluate((element, value) => {
    const top = element.getBoundingClientRect().top + window.scrollY - value;
    window.scrollTo({ top, behavior: "smooth" });
  }, offset);
  await pause(page, 800);
}

test("records the store demo", async () => {
  const testInfo = test.info();
  await fs.mkdir(videoDirectory, { recursive: true });
  await fs.rm(videoPath, { force: true });
  await fs.rm(mp4Path, { force: true });
  const iconDataUrl = `data:image/png;base64,${(await fs.readFile(iconPath)).toString("base64")}`;

  const context = await chromium.launchPersistentContext(testInfo.outputPath("profile"), {
    channel: "chromium",
    viewport: { width: 1280, height: 720 },
    permissions: ["clipboard-read", "clipboard-write"],
    recordVideo: { dir: testInfo.outputPath("recording"), size: { width: 1280, height: 720 } },
    args: [
      "--lang=en-US",
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  const page = context.pages()[0] ?? (await context.newPage());
  const video = page.video();

  try {
    await page.route(fixtureUrl, (route) =>
      route.fulfill({ body: demoFixture(iconDataUrl), contentType: "text/html" }),
    );
    await page.goto(fixtureUrl);
    // Re-apply the viewport so the recording matches it after the extension page navigation.
    await page.setViewportSize({ width: 1280, height: 721 });
    await page.setViewportSize({ width: 1280, height: 720 });
    const wrapper = page.locator(".github-table-enhancer-scroll").last();
    const table = wrapper.locator("table");
    const metadata = page.locator(".github-table-enhancer-metadata");
    await expect(wrapper).toBeVisible();
    await expect(metadata).toBeVisible();
    await moveTo(page, 640, 360, 1);

    console.log("Demo step: Intro");
    await pause(page, 2_200);
    await card(page, null);
    await pause(page, 300);

    console.log("Demo step: Frontmatter");
    await caption(
      page,
      "Frontmatter becomes clean properties",
      "YAML metadata shows as a collapsible panel",
    );
    await hover(page, metadata.locator("dd").nth(2), 20);
    await pause(page, 1_400);
    await hideCaption(page);

    console.log("Demo step: Hover");
    await scrollPageTo(page, wrapper, 70);
    await caption(
      page,
      "Never lose your place",
      "The row and column under the pointer are highlighted",
    );
    await hover(page, table.locator("tbody tr").nth(1).locator("td").nth(1), 20);
    await pause(page, 300);
    await hover(page, table.locator("tbody tr").nth(4).locator("td").nth(3), 25);
    await pause(page, 300);
    await hover(page, table.locator("tbody tr").nth(2).locator("td").nth(5), 25);
    await pause(page, 600);
    await hideCaption(page);

    console.log("Demo step: Freeze");
    await caption(
      page,
      "Freeze header rows and columns",
      "Key columns stay in view while you scroll",
    );
    await click(page, wrapper.getByRole("button", { name: "Freeze" }));
    await wrapper.getByLabel("Frozen rows").fill("1");
    await pause(page, 500);
    await wrapper.getByLabel("Frozen columns").fill("1");
    await pause(page, 800);
    await click(page, wrapper.getByRole("button", { name: "Freeze" }), 300);
    await scrollPageTo(page, wrapper, 20);
    await hover(page, table.locator("tbody tr").nth(5).locator("td").nth(4));
    await scrollWrapper(page, wrapper, 700, 0, 1_500);
    await scrollWrapper(page, wrapper, 0, 0, 900);
    await hideCaption(page);

    console.log("Demo step: Sort");
    await caption(
      page,
      "Sort from any column header",
      "Ascending, descending, then back to the original order",
    );
    const statusHeader = table.locator("th").nth(1);
    await hover(page, statusHeader);
    await click(
      page,
      wrapper.getByRole("button", { name: "Sort by column 2", exact: true }),
      1_000,
    );
    await click(
      page,
      wrapper.getByRole("button", { name: "Sort by column 2", exact: true }),
      1_000,
    );
    await click(page, wrapper.getByRole("button", { name: "Sort by column 2", exact: true }), 700);
    await hideCaption(page);

    console.log("Demo step: Filter");
    await caption(page, "Filter rows instantly", "Plain text or regular expressions");
    await click(page, wrapper.getByRole("button", { name: "Filter" }));
    await wrapper.getByLabel("Filter rows").pressSequentially("ready", { delay: 110 });
    await pause(page, 1_300);
    await click(page, wrapper.getByRole("button", { name: "Clear filter" }), 400);
    await page.keyboard.press("Escape");
    await hideCaption(page);

    console.log("Demo step: Select rows");
    await caption(
      page,
      "Keep only the rows you need",
      "Pick rows with checkboxes, then show just those",
    );
    await click(page, wrapper.getByRole("button", { name: "Select rows", exact: true }));
    await click(page, wrapper.getByRole("checkbox", { name: "Select all visible rows" }), 500);
    for (const index of [0, 2, 5, 8]) {
      await click(page, table.locator("tbody tr").nth(index).getByRole("checkbox"), 300);
    }
    await pause(page, 500);
    await click(page, wrapper.getByRole("button", { name: "Show selected rows" }), 1_200);
    await hideCaption(page);

    console.log("Demo step: Hide columns");
    await caption(page, "Hide columns you don't need", "Bring everything back with Show hidden");
    for (const column of [4, 3]) {
      const hideButton = page.getByRole("button", { name: `Hide column ${column}` });
      await hover(page, table.locator("th", { has: hideButton }));
      await click(page, hideButton, 700);
    }
    await pause(page, 600);
    await click(page, wrapper.getByRole("button", { name: "Show hidden" }), 1_100);
    await hideCaption(page);

    console.log("Demo step: Resize");
    await caption(page, "Drag to resize columns", "Make room for the content that matters");
    const productHeader = table.locator("th").first();
    await hover(page, productHeader);
    const handle = productHeader.locator(".github-table-enhancer-column-resize-handle");
    await hover(page, handle);
    await pause(page, 250);
    await page.mouse.down();
    await moveTo(page, pointer.x + 160, pointer.y, 30);
    await pause(page, 300);
    await page.mouse.up();
    await pause(page, 900);
    await hideCaption(page);

    console.log("Demo step: Fit and Wrap");
    await caption(
      page,
      "Fit and wrap wide content",
      "Auto-fit columns and wrap long cells to fit the page",
    );
    await click(page, wrapper.getByRole("button", { name: "Fit" }), 1_000);
    await click(page, wrapper.getByRole("button", { name: "Wrap" }), 1_300);
    await hideCaption(page);

    console.log("Demo step: Copy");
    await caption(page, "Copy exactly what you see", "As Markdown, CSV, or TSV");
    await click(page, wrapper.getByRole("button", { name: "Copy as" }));
    await click(page, wrapper.getByRole("button", { name: "Markdown", exact: true }), 1_300);
    await page.keyboard.press("Escape");
    await hideCaption(page);

    console.log("Demo step: Focus mode");
    await caption(page, "Focus on one table", "Expand it to the full window, press Esc to return");
    await click(page, wrapper.getByRole("button", { name: "Expand" }), 1_300);
    await hover(page, table.locator("tbody tr").nth(3).locator("td").nth(2), 25);
    await pause(page, 500);
    await page.keyboard.press("Escape");
    await pause(page, 800);
    await hideCaption(page);

    console.log("Demo step: Reset");
    await caption(
      page,
      "Reset the view anytime",
      "Return to the original Markdown table in one click",
    );
    await click(page, wrapper.getByRole("button", { name: "Reset table view" }), 1_200);
    await hideCaption(page);

    console.log("Demo step: Outro");
    await moveTo(page, 1_300, 760, 10);
    await card(page, "outro");
    await pause(page, 3_500);

    await page.close();
    console.log("Demo step: Save video");

    if (!video) {
      throw new Error("Playwright did not create a video recording.");
    }
    await video.saveAs(videoPath);
    console.log(`Demo video: ${videoPath}`);
  } finally {
    await context.close();
  }

  try {
    await promisify(execFile)("ffmpeg", [
      "-y",
      "-i",
      videoPath,
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      mp4Path,
    ]);
    console.log(`Demo video (MP4): ${mp4Path}`);
  } catch {
    console.log("Skipped MP4 conversion because ffmpeg is not available.");
  }
});
