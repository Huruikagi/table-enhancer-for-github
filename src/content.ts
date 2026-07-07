const TABLE_WRAPPER_CLASS = "github-table-enhancer-scroll";

function isMarkdownBlobPage(): boolean {
  return /^\/[^/]+\/[^/]+\/blob\/.+\.md$/i.test(window.location.pathname);
}

function findMarkdownContainer(): ParentNode {
  return (
    document.querySelector(".markdown-body") ??
    document.querySelector("[data-testid='readme']") ??
    document
  );
}

function wrapTable(table: HTMLTableElement): void {
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
  table.dataset.githubTableEnhancer = "true";
  parent.insertBefore(wrapper, table);
  wrapper.appendChild(table);
}

function enhanceTables(): void {
  if (!isMarkdownBlobPage()) {
    return;
  }

  const markdownContainer = findMarkdownContainer();
  const tables = markdownContainer.querySelectorAll<HTMLTableElement>("table");
  tables.forEach(wrapTable);
}

enhanceTables();

const observer = new MutationObserver(() => {
  enhanceTables();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});
