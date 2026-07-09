import { readHeadingFreezeRule, saveHeadingFreezeRule } from "./freeze-rule-storage";
import {
  TABLE_COLUMN_RESIZE_HANDLE_CLASS,
  TABLE_CONTROLS_CLASS,
  TABLE_CONTROLS_PANEL_CLASS,
  TABLE_CONTROLS_TAG,
  TABLE_CONTROLS_TOGGLE_CLASS,
  TABLE_HIDE_BUTTON_CLASS,
  TABLE_WRAPPER_CLASS,
} from "./table-constants";
import { createTableControls } from "./table-controls";
import { applyTableFreeze } from "./table-freeze";

export { applyTableFreeze } from "./table-freeze";
export { applyTableVisibility } from "./table-visibility";
export {
  TABLE_COLUMN_RESIZE_HANDLE_CLASS,
  TABLE_CONTROLS_CLASS,
  TABLE_CONTROLS_PANEL_CLASS,
  TABLE_CONTROLS_TAG,
  TABLE_CONTROLS_TOGGLE_CLASS,
  TABLE_HIDE_BUTTON_CLASS,
  TABLE_WRAPPER_CLASS,
};

export function isMarkdownBlobPage(pathname = window.location.pathname): boolean {
  return /^\/[^/]+\/[^/]+\/blob\/.+\.md$/i.test(pathname);
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
  if (table.dataset.githubTableEnhancer === "true") {
    return;
  }

  const parent = table.parentElement;
  if (!parent || parent.classList.contains(TABLE_WRAPPER_CLASS)) {
    table.dataset.githubTableEnhancer = "true";
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = TABLE_WRAPPER_CLASS;
  const headingText = findPreviousHeadingText(table);
  const controls = createTableControls(table, (values) => applyTableFreeze(table, values), {
    defaultValuesPromise: headingText ? readHeadingFreezeRule(headingText) : null,
    headingText,
    onSaveDefault: headingText ? (values) => saveHeadingFreezeRule(headingText, values) : undefined,
  });
  table.dataset.githubTableEnhancer = "true";
  parent.insertBefore(wrapper, table);
  wrapper.appendChild(controls);
  wrapper.appendChild(table);
}

export function enhanceTables(root: ParentNode = document): void {
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

export function startTableEnhancer(): MutationObserver {
  enhanceTables();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          enhanceTables(node);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return observer;
}
