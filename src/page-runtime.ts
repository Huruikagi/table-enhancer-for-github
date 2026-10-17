import { EMBEDDED_DATA_SELECTOR, reconcileFrontmatter } from "./frontmatter/runtime";
import { enhanceMarkdownTables } from "./table/discovery";
import { destroyDetachedTableRuntimes } from "./table/lifecycle";

export function enhanceTables(root: ParentNode = document): void {
  reconcileFrontmatter();
  enhanceMarkdownTables(root);
}

function collectArticles(node: Node, articles: Set<HTMLElement>): void {
  const element = node instanceof Element ? node : node.parentElement;
  if (!element) return;
  const article = element.closest<HTMLElement>(".markdown-body");
  if (article) articles.add(article);
  for (const descendant of element.querySelectorAll<HTMLElement>(".markdown-body")) {
    articles.add(descendant);
  }
}

function containsEmbeddedData(node: Node): boolean {
  const element = node instanceof Element ? node : node.parentElement;
  return (
    !!element &&
    (element.matches(EMBEDDED_DATA_SELECTOR) ||
      element.querySelector(EMBEDDED_DATA_SELECTOR) !== null)
  );
}

/** Routes page mutations to metadata reconciliation, discovery, and runtime cleanup. */
export function startTableEnhancer(): MutationObserver {
  let pathname = window.location.pathname;
  const observer = new MutationObserver((mutations) => {
    const articles = new Set<HTMLElement>();
    const sourceScopes = new Set<ParentNode>();
    const added = new Set<Element>();
    const removed = new Set<Element>();

    if (pathname !== window.location.pathname) {
      pathname = window.location.pathname;
      sourceScopes.add(document);
    }
    for (const mutation of mutations) {
      // Changes inside an article affect that article, not every Markdown preview.
      const target =
        mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      const article = target?.closest<HTMLElement>(".markdown-body");
      if (article) articles.add(article);

      const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
      if (target?.matches(EMBEDDED_DATA_SELECTOR) || changedNodes.some(containsEmbeddedData)) {
        sourceScopes.add(target?.closest("react-app") ?? document);
      }
      for (const node of changedNodes) collectArticles(node, articles);
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) added.add(node);
      }
      for (const node of mutation.removedNodes) {
        if (node instanceof Element) removed.add(node);
      }
    }
    for (const scope of sourceScopes) {
      for (const article of scope.querySelectorAll<HTMLElement>(".markdown-body")) {
        articles.add(article);
      }
    }
    if (articles.size > 0) reconcileFrontmatter(articles);
    for (const node of added) enhanceMarkdownTables(node);
    for (const node of removed) destroyDetachedTableRuntimes(node);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  enhanceTables();
  return observer;
}
