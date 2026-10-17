import { type MetadataSource, readMetadataSource } from "./source";
import { createMetadataView, METADATA_CLASS } from "./view";

const ORIGINAL_ATTRIBUTE = "data-gte-metadata-original";
export const EMBEDDED_DATA_SELECTOR =
  'script[type="application/json"][data-target="react-app.embeddedData"]';
const sources = new WeakMap<Element, { json: string; source: MetadataSource | null }>();
const views = new Map<
  HTMLElement,
  {
    original: HTMLElement;
    view: HTMLElement;
    source: MetadataSource;
    hiddenAttribute: string | null;
  }
>();

function firstTable(article: Element): { original: HTMLElement; table: HTMLTableElement } | null {
  const first = Array.from(article.children).find(
    (child) => !child.classList.contains(METADATA_CLASS),
  );
  if (!(first instanceof HTMLElement)) return null;
  const table = first instanceof HTMLTableElement ? first : first.firstElementChild;
  if (!(table instanceof HTMLTableElement)) return null;
  if (first !== table && first.tagName !== "MARKDOWN-ACCESSIBLITY-TABLE") return null;
  return { original: first, table };
}

function isKeyValueTable(table: HTMLTableElement): boolean {
  return (
    !table.tHead &&
    table.rows.length > 0 &&
    Array.from(table.rows).every(
      (row) =>
        row.cells.length === 2 && row.cells[0].tagName === "TH" && row.cells[1].tagName === "TD",
    )
  );
}

// This conservative shape check only exempts ambiguous metadata from normal
// table controls. It never authorizes replacing a table with a property view.
export function isMetadataTable(table: HTMLTableElement): boolean {
  if (table.closest(`[${ORIGINAL_ATTRIBUTE}]`)) return true;
  const article = table.closest(".markdown-body");
  const candidate = article ? firstTable(article) : null;
  return !!candidate && candidate.table.contains(table) && isKeyValueTable(candidate.table);
}

function sourceFor(article: HTMLElement): MetadataSource | null {
  const scope = article.closest("react-app") ?? document;
  const matches: MetadataSource[] = [];
  let pathname: string;
  try {
    pathname = decodeURIComponent(window.location.pathname);
  } catch {
    return null;
  }
  for (const script of Array.from(scope.querySelectorAll(EMBEDDED_DATA_SELECTOR))) {
    const json = script.textContent ?? "";
    let cached = sources.get(script);
    if (!cached || cached.json !== json) {
      cached = { json, source: readMetadataSource(json) };
      sources.set(script, cached);
    }
    if (cached.source?.pathname === pathname) matches.push(cached.source);
  }
  return matches.length === 1 ? matches[0] : null;
}

function restore(article: HTMLElement): void {
  const existing = views.get(article);
  if (!existing) return;
  existing.view.remove();
  if (existing.hiddenAttribute === null) existing.original.removeAttribute("hidden");
  else existing.original.setAttribute("hidden", existing.hiddenAttribute);
  existing.original.removeAttribute(ORIGINAL_ATTRIBUTE);
  views.delete(article);
}

export function reconcileFrontmatter(
  articles: Iterable<HTMLElement> = document.querySelectorAll<HTMLElement>(".markdown-body"),
): void {
  for (const [article] of views) {
    if (!article.isConnected) restore(article);
  }
  for (const article of articles) {
    if (!article.isConnected) continue;
    const candidate = firstTable(article);
    const source = sourceFor(article);
    const existing = views.get(article);
    let tableHTML = candidate?.table.outerHTML;
    if (candidate && existing?.original === candidate.table) {
      const copy = candidate.table.cloneNode(true) as HTMLTableElement;
      copy.removeAttribute(ORIGINAL_ATTRIBUTE);
      if (existing.hiddenAttribute === null) copy.removeAttribute("hidden");
      else copy.setAttribute("hidden", existing.hiddenAttribute);
      tableHTML = copy.outerHTML;
    }
    const matches =
      candidate &&
      source &&
      isKeyValueTable(candidate.table) &&
      tableHTML === source.tableHTML &&
      candidate.table.rows.length === source.values.size &&
      Array.from(source.values.keys()).every(
        (key, index) => candidate.table.rows[index].cells[0].textContent === key,
      );
    if (
      existing &&
      (!matches ||
        existing.source !== source ||
        existing.original !== candidate.original ||
        existing.view.parentElement !== article)
    ) {
      restore(article);
    }
    if (!matches || views.has(article)) continue;
    const view = createMetadataView(source.values);
    views.set(article, {
      original: candidate.original,
      view,
      source,
      hiddenAttribute: candidate.original.getAttribute("hidden"),
    });
    candidate.original.setAttribute(ORIGINAL_ATTRIBUTE, "");
    candidate.original.hidden = true;
    article.insertBefore(view, candidate.original);
  }
}
