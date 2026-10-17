import { isMap, isScalar, isSeq, parseDocument } from "yaml";

export type MetadataValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | MetadataValue[]
  | Map<string, MetadataValue>;

export function parseFrontmatter(lines: readonly string[]): Map<string, MetadataValue> | null {
  if (!/^\uFEFF?---[ \t]*$/.test(lines[0] ?? "")) return null;
  const end = lines.findIndex((line, index) => index > 0 && /^---[ \t]*$/.test(line));
  if (end < 0) return null;
  const source = lines.slice(1, end).join("\n");
  if (source.length > 65_536) return null;

  try {
    const document = parseDocument(source, { intAsBigInt: true });
    if (document.errors.length || document.warnings.length || !isMap(document.contents))
      return null;
    let remaining = 1_000;
    const convert = (node: unknown, depth: number): MetadataValue => {
      if (--remaining < 0 || depth > 20) throw new Error("Metadata is too large");
      if (node === null) return null;
      if (isScalar(node)) {
        const value: unknown = node.value;
        if (
          value === null ||
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "bigint" ||
          typeof value === "boolean"
        )
          return value;
      }
      if (isSeq(node)) return node.items.map((item) => convert(item, depth + 1));
      if (isMap(node)) {
        const result = new Map<string, MetadataValue>();
        for (const pair of node.items) {
          if (!isScalar(pair.key) || typeof pair.key.value !== "string") {
            throw new Error("Unsupported metadata key");
          }
          result.set(pair.key.value, convert(pair.value, depth + 1));
        }
        return result;
      }
      // Aliases and custom types are left to GitHub; never expand recursive YAML.
      throw new Error("Unsupported metadata value");
    };
    const result = convert(document.contents, 0);
    return result instanceof Map && result.size > 0 ? result : null;
  } catch {
    return null;
  }
}

type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
}

export type MetadataSource = {
  pathname: string;
  values: Map<string, MetadataValue>;
  tableHTML: string;
};

// Both embedded JSON and the narrow page-cache projection use this validator.
// Unknown layouts fail closed; neither path has a network fallback.
export function readMetadataSource(json: string): MetadataSource | null {
  try {
    const payload = record(record(JSON.parse(json)).payload);
    const layout = record(payload.codeViewLayoutRoute);
    const blobLayout = record(payload.codeViewBlobLayoutRoute);
    const repo = record(layout.repo);
    const ref = record(layout.refInfo);
    const blobRef = record(blobLayout.refInfo);
    const rawLines = record(payload["codeViewBlobLayoutRoute.StyledBlob"]).rawLines;
    const richText = record(payload.codeViewBlobRoute).richText;
    if (
      typeof repo.ownerLogin !== "string" ||
      typeof repo.name !== "string" ||
      typeof layout.path !== "string" ||
      !/\.md$/i.test(layout.path) ||
      typeof ref.name !== "string" ||
      typeof ref.currentOid !== "string" ||
      !/^[a-f\d]{40}$/i.test(ref.currentOid) ||
      blobLayout.path !== layout.path ||
      blobRef.name !== ref.name ||
      blobRef.currentOid !== ref.currentOid ||
      !Array.isArray(rawLines) ||
      !rawLines.every((line) => typeof line === "string") ||
      typeof richText !== "string"
    )
      return null;
    const values = parseFrontmatter(rawLines);
    if (!values) return null;
    // A template is inert: parsing richText must not load images or execute HTML.
    const template = document.createElement("template");
    template.innerHTML = richText;
    const article = template.content.querySelector(".markdown-body");
    const first = article?.firstElementChild;
    const table = first?.matches("table") ? first : first?.querySelector("table");
    if (!table || (first?.tagName !== "MARKDOWN-ACCESSIBLITY-TABLE" && first !== table))
      return null;
    return {
      pathname: `/${repo.ownerLogin}/${repo.name}/blob/${ref.name}/${layout.path}`,
      values,
      tableHTML: table.outerHTML,
    };
  } catch {
    return null;
  }
}
