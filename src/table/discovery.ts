import { isMetadataTable } from "../frontmatter/runtime";
import { TABLE_WRAPPER_CLASS } from "./constants";
import { readHeadingFreezeRule, saveHeadingFreezeRule } from "./freeze-rule-storage";
import { mountManagedTable } from "./lifecycle";

export function isMarkdownBlobPage(pathname = window.location.pathname): boolean {
  return /^\/[^/]+\/[^/]+\/blob\/.+\.md$/i.test(pathname);
}

export function getRepositoryKey(pathname = window.location.pathname): string | null {
  const match = /^\/([^/]+)\/([^/]+)\/blob\//.exec(pathname);

  return match ? `${match[1].toLowerCase()}/${match[2].toLowerCase()}` : null;
}

export function findMarkdownContainer(root: ParentNode = document): ParentNode {
  return (
    root.querySelector(".markdown-body") ?? root.querySelector("[data-testid='readme']") ?? root
  );
}

export function normalizeHeadingText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function findPreviousHeadingText(table: HTMLTableElement): string | null {
  const markdownContainer =
    table.closest(".markdown-body") ?? table.closest("[data-testid='readme']") ?? document;
  const headings = Array.from(
    markdownContainer.querySelectorAll<HTMLHeadingElement>("h1,h2,h3,h4,h5,h6"),
  );
  let previousHeadingText: string | null = null;

  for (const heading of headings) {
    if (heading.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING) {
      const headingText = normalizeHeadingText(heading.textContent ?? "");

      if (headingText) {
        previousHeadingText = headingText;
      }
    }
  }

  return previousHeadingText;
}

export function wrapTable(table: HTMLTableElement): void {
  // Metadata has its own property view or native fallback. Other nested table
  // groups stay native so parent and child controls cannot interfere.
  if (
    isMetadataTable(table) ||
    table.parentElement?.closest("table") ||
    table.querySelector("table")
  ) {
    return;
  }

  if (table.dataset.githubTableEnhancer === "true") {
    return;
  }

  const parent = table.parentElement;
  if (!parent) {
    table.dataset.githubTableEnhancer = "true";
    return;
  }

  const wrapper = parent.classList.contains(TABLE_WRAPPER_CLASS)
    ? parent
    : document.createElement("div");
  const headingText = findPreviousHeadingText(table);
  const repository = getRepositoryKey();
  table.dataset.githubTableEnhancer = "true";

  if (!parent.classList.contains(TABLE_WRAPPER_CLASS)) {
    wrapper.className = TABLE_WRAPPER_CLASS;
    parent.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  }

  const runtime = mountManagedTable(table, {
    defaultValuesPromise:
      headingText && repository ? readHeadingFreezeRule(repository, headingText) : null,
    headingText,
    onSaveDefault:
      headingText && repository
        ? (values) => saveHeadingFreezeRule(repository, headingText, values)
        : undefined,
  });
  wrapper.insertBefore(runtime.controls, table);
}

export function enhanceMarkdownTables(root: ParentNode): void {
  if (!isMarkdownBlobPage()) {
    return;
  }

  const markdownContainer = findMarkdownContainer(root);
  const tables = Array.from(markdownContainer.querySelectorAll<HTMLTableElement>("table"));

  if (markdownContainer instanceof HTMLTableElement) {
    tables.unshift(markdownContainer);
  }

  tables.forEach(wrapTable);
}
