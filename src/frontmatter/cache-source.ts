// GitHub UI Service uses these TanStack Query keys instead of retaining its
// initial embedded JSON. Keep this private schema at a single, fail-closed edge.
export const CACHE_SOURCE_ATTRIBUTE = "data-gte-metadata-source";

type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
}

export type CachedQuery = {
  queryKey: readonly unknown[];
  state: { data?: unknown; status?: string; fetchStatus?: string; isInvalidated?: boolean };
};

export function isMetadataQuery(query: unknown): boolean {
  const key = record(query).queryKey;
  if (!Array.isArray(key)) return false;
  const [app, route, , name] = key;
  return (
    app === "code-view" &&
    ((name === "mainQuery" &&
      (route === "codeViewLayoutRoute" ||
        route === "codeViewBlobLayoutRoute" ||
        route === "codeViewBlobRoute")) ||
      (route === "codeViewBlobLayoutRoute" && name === "codeViewBlobLayoutRoute.StyledBlob"))
  );
}

function decoded(path: unknown): string | null {
  if (typeof path !== "string") return null;
  try {
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

function refInfo(value: unknown) {
  const ref = record(value);
  return { name: ref.name, currentOid: ref.currentOid };
}

/** Copies only the current file's identity, YAML header and first preview table. */
export function readCachedMetadata(
  queries: readonly CachedQuery[],
  pathname: string,
): string | null {
  const path = decoded(pathname);
  const match = path?.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+\.md)$/i);
  if (!match) return null;
  const prefix = `/${match[1]}/${match[2]}`;
  const file = match[3];
  const find = (route: string, name: string, expectedPath: string): RecordValue | null => {
    const candidates = queries.filter(
      (query) =>
        isMetadataQuery(query) &&
        query.queryKey[1] === route &&
        query.queryKey[3] === name &&
        decoded(record(query.queryKey[4]).pathname) === expectedPath &&
        query.state.status === "success" &&
        query.state.fetchStatus === "idle" &&
        !query.state.isInvalidated,
    );
    return candidates.length === 1 ? record(candidates[0].state.data) : null;
  };
  const layout = record(find("codeViewLayoutRoute", "mainQuery", `${prefix}/_layout`)?.payload);
  const blob = record(
    find("codeViewBlobLayoutRoute", "mainQuery", `${prefix}/_layout/${file}`)?.payload,
  );
  const repo = record(layout.repo);
  const ref = refInfo(layout.refInfo);
  const blobRef = refInfo(blob.refInfo);
  if (
    repo.ownerLogin !== match[1] ||
    repo.name !== match[2] ||
    typeof layout.path !== "string" ||
    layout.path.length > 4_096 ||
    blob.path !== layout.path ||
    typeof ref.name !== "string" ||
    typeof ref.currentOid !== "string" ||
    !/^[a-f\d]{40}$/i.test(ref.currentOid) ||
    ref.name !== blobRef.name ||
    ref.currentOid !== blobRef.currentOid ||
    `${ref.name}/${layout.path}` !== file
  )
    return null;
  const preview = record(find("codeViewBlobRoute", "mainQuery", path ?? "")?.payload);
  const styled = find(
    "codeViewBlobLayoutRoute",
    "codeViewBlobLayoutRoute.StyledBlob",
    `${prefix}/_styled/${file}`,
  );
  const rawLines = (
    Array.isArray(styled?.rawLines)
      ? styled
      : record(record(styled?.payload)["codeViewBlobLayoutRoute.StyledBlob"])
  )?.rawLines;
  if (!Array.isArray(rawLines) || !/^\uFEFF?---[ \t]*$/.test(rawLines[0])) return null;
  const lines: string[] = [];
  let size = 0;
  for (const line of rawLines) {
    if (typeof line !== "string") return null;
    size += line.length + 1;
    if (size > 65_536) return null;
    lines.push(line);
    if (lines.length > 1 && /^---[ \t]*$/.test(line)) break;
  }
  if (lines.length < 2 || !/^---[ \t]*$/.test(lines[lines.length - 1])) return null;
  if (typeof preview.richText !== "string" || preview.richText.length > 2_000_000) return null;
  const template = document.createElement("template");
  template.innerHTML = preview.richText;
  const first = template.content.querySelector(".markdown-body")?.firstElementChild;
  const table = first?.matches("table") ? first : first?.firstElementChild;
  if (
    !table?.matches("table") ||
    (first !== table && first?.tagName !== "MARKDOWN-ACCESSIBLITY-TABLE") ||
    table.outerHTML.length > 262_144
  )
    return null;
  return JSON.stringify({
    payload: {
      codeViewLayoutRoute: {
        repo: { ownerLogin: repo.ownerLogin, name: repo.name },
        path: layout.path,
        refInfo: ref,
      },
      codeViewBlobLayoutRoute: { path: blob.path, refInfo: blobRef },
      "codeViewBlobLayoutRoute.StyledBlob": { rawLines: lines },
      codeViewBlobRoute: {
        richText: `<article class="markdown-body">${table.outerHTML}</article>`,
      },
    },
  });
}
