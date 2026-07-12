import {
  FILTERED_ROW_DATA_ATTRIBUTE,
  HIDDEN_COLUMN_DATA_ATTRIBUTE,
  HIDDEN_ROW_DATA_ATTRIBUTE,
} from "../constants";

export type CopyFormat = "markdown" | "csv" | "tsv";

function getCellText(cell: HTMLTableCellElement): string {
  const clone = cell.cloneNode(true);

  if (!(clone instanceof HTMLTableCellElement)) {
    return "";
  }

  for (const control of clone.querySelectorAll("button")) {
    control.remove();
  }

  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function getVisibleTableData(table: HTMLTableElement): string[][] {
  return Array.from(table.rows)
    .filter(
      (row) =>
        row.dataset[HIDDEN_ROW_DATA_ATTRIBUTE] !== "true" &&
        row.dataset[FILTERED_ROW_DATA_ATTRIBUTE] !== "true",
    )
    .map((row) =>
      Array.from(row.cells)
        .filter((cell) => cell.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE] !== "true")
        .map(getCellText),
    )
    .filter((row) => row.length > 0);
}

function escapeMarkdownCell(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n|\r/g, "<br>");
}

function formatMarkdown(rows: readonly (readonly string[])[]): string {
  if (rows.length === 0) {
    return "";
  }

  const columnCount = Math.max(...rows.map((row) => row.length), 0);
  const normalizedRows = rows.map((row) =>
    Array.from({ length: columnCount }, (_, index) => escapeMarkdownCell(row[index] ?? "")),
  );
  const [headerRow, ...bodyRows] = normalizedRows;
  const separatorRow = Array.from({ length: columnCount }, () => "---");

  return [headerRow, separatorRow, ...bodyRows].map((row) => `| ${row.join(" | ")} |`).join("\n");
}

function escapeDelimitedCell(value: string, delimiter: string): string {
  if (!value.includes(delimiter) && !value.includes('"') && !/[\r\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function formatDelimited(rows: readonly (readonly string[])[], delimiter: string): string {
  return rows
    .map((row) => row.map((cell) => escapeDelimitedCell(cell, delimiter)).join(delimiter))
    .join("\n");
}

export function serializeTableData(
  rows: readonly (readonly string[])[],
  format: CopyFormat,
): string {
  if (format === "markdown") {
    return formatMarkdown(rows);
  }

  return formatDelimited(rows, format === "csv" ? "," : "\t");
}

export async function copyVisibleTable(table: HTMLTableElement, format: CopyFormat): Promise<void> {
  await navigator.clipboard.writeText(serializeTableData(getVisibleTableData(table), format));
}
