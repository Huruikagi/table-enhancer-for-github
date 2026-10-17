import { translate } from "../i18n";
import type { MetadataValue } from "./source";

export const METADATA_CLASS = "github-table-enhancer-metadata";

function scalar(value: MetadataValue): string {
  if (value === null) return "null";
  return value === "" ? '""' : String(value);
}

function countLabel(count: number): string {
  return translate(count === 1 ? "metadataItem" : "metadataItems", [count]);
}

function renderValue(value: MetadataValue): HTMLElement {
  if (value instanceof Map || Array.isArray(value)) {
    const size = value instanceof Map ? value.size : value.length;
    if (!size) {
      const empty = document.createElement("code");
      empty.textContent = value instanceof Map ? "{}" : "[]";
      return empty;
    }
    if (
      Array.isArray(value) &&
      value.length <= 8 &&
      value.every(
        (item) =>
          !(item instanceof Map) &&
          !Array.isArray(item) &&
          scalar(item).length <= 80 &&
          !scalar(item).includes("\n"),
      )
    ) {
      const list = document.createElement("ul");
      list.className = "gte-metadata-tags";
      for (const item of value) {
        const tag = document.createElement("li");
        tag.textContent = scalar(item);
        list.append(tag);
      }
      return list;
    }
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = countLabel(size);
    details.append(summary);
    if (value instanceof Map) details.append(renderProperties(value));
    else {
      const list = document.createElement("ol");
      for (const item of value) {
        const row = document.createElement("li");
        row.append(renderValue(item));
        list.append(row);
      }
      details.append(list);
    }
    return details;
  }
  const text = document.createElement(typeof value === "string" ? "span" : "code");
  text.className = "gte-metadata-value";
  text.textContent = scalar(value);
  return text;
}

function renderProperties(values: Map<string, MetadataValue>): HTMLDListElement {
  const list = document.createElement("dl");
  for (const [key, value] of values) {
    const row = document.createElement("div");
    row.className = "gte-metadata-row";
    const label = document.createElement("dt");
    label.textContent = key;
    const content = document.createElement("dd");
    content.append(renderValue(value));
    row.append(label, content);
    list.append(row);
  }
  return list;
}

export function createMetadataView(values: Map<string, MetadataValue>): HTMLDetailsElement {
  const details = document.createElement("details");
  details.className = METADATA_CLASS;
  details.open = true;
  const summary = document.createElement("summary");
  summary.append(document.createTextNode(translate("metadata")));
  const count = document.createElement("span");
  count.className = "gte-metadata-count";
  count.textContent = countLabel(values.size);
  summary.append(count);
  details.append(summary, renderProperties(values));
  return details;
}
