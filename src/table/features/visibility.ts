import {
  FILTERED_ROW_DATA_ATTRIBUTE,
  HIDDEN_COLUMN_DATA_ATTRIBUTE,
  HIDDEN_ROW_DATA_ATTRIBUTE,
} from "../constants";
import { getOriginalRowIndex, initializeOriginalRowIndexes } from "./sort";

export type TableVisibility = {
  rows: readonly number[];
  columns: readonly number[];
  filterQuery?: string;
  filterUsesRegularExpression?: boolean;
};

export type TableFilterResult = {
  matchingRows: number;
  totalRows: number;
  visibleRows: number;
};

export function getFilterRegularExpressionError(filterQuery: string): string | null {
  if (!filterQuery.trim()) {
    return null;
  }

  try {
    new RegExp(filterQuery, "i");
    return null;
  } catch {
    return "Invalid regular expression";
  }
}

function isHeaderRow(table: HTMLTableElement, row: HTMLTableRowElement, rowIndex: number): boolean {
  if (table.tHead) {
    return table.tHead.contains(row);
  }

  return rowIndex === 0;
}

function isFilteredRow(
  table: HTMLTableElement,
  row: HTMLTableRowElement,
  rowIndex: number,
  matchesFilter: ((text: string) => boolean) | null,
): boolean {
  if (!matchesFilter || isHeaderRow(table, row, rowIndex)) {
    return false;
  }

  return !matchesFilter(row.textContent ?? "");
}

function createFilterMatcher(
  filterQuery: string,
  filterUsesRegularExpression = false,
): ((text: string) => boolean) | null {
  if (!filterQuery.trim()) {
    return null;
  }

  if (filterUsesRegularExpression) {
    try {
      const regularExpression = new RegExp(filterQuery, "i");
      return (text) => regularExpression.test(text);
    } catch {
      return null;
    }
  }

  const normalizedFilterQuery = filterQuery.trim().toLowerCase();
  return (text) => text.toLowerCase().includes(normalizedFilterQuery);
}

export function getTableFilterResult(
  table: HTMLTableElement,
  visibility: TableVisibility,
): TableFilterResult | null {
  initializeOriginalRowIndexes(table);
  const filterQuery = visibility.filterQuery ?? "";
  const matchesFilter = createFilterMatcher(filterQuery, visibility.filterUsesRegularExpression);

  if (!matchesFilter) {
    return null;
  }

  const hiddenRows = new Set(visibility.rows);
  let matchingRows = 0;
  let totalRows = 0;
  let visibleRows = 0;

  for (const [rowIndex, row] of Array.from(table.rows).entries()) {
    if (isHeaderRow(table, row, rowIndex)) {
      continue;
    }

    totalRows += 1;
    if (!matchesFilter(row.textContent ?? "")) {
      continue;
    }

    matchingRows += 1;
    if (!hiddenRows.has(getOriginalRowIndex(row))) {
      visibleRows += 1;
    }
  }

  return { matchingRows, totalRows, visibleRows };
}

export function applyTableVisibility(table: HTMLTableElement, visibility: TableVisibility): void {
  initializeOriginalRowIndexes(table);
  const hiddenRows = new Set(visibility.rows);
  const hiddenColumns = new Set(visibility.columns);
  const filterQuery = visibility.filterQuery ?? "";
  const matchesFilter = createFilterMatcher(filterQuery, visibility.filterUsesRegularExpression);
  const columns = table.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col");

  for (const [rowIndex, row] of Array.from(table.rows).entries()) {
    if (hiddenRows.has(getOriginalRowIndex(row))) {
      row.dataset[HIDDEN_ROW_DATA_ATTRIBUTE] = "true";
    } else {
      delete row.dataset[HIDDEN_ROW_DATA_ATTRIBUTE];
    }

    if (isFilteredRow(table, row, rowIndex, matchesFilter)) {
      row.dataset[FILTERED_ROW_DATA_ATTRIBUTE] = "true";
    } else {
      delete row.dataset[FILTERED_ROW_DATA_ATTRIBUTE];
    }

    for (const [columnIndex, cell] of Array.from(row.cells).entries()) {
      if (hiddenColumns.has(columnIndex)) {
        cell.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE] = "true";
      } else {
        delete cell.dataset[HIDDEN_COLUMN_DATA_ATTRIBUTE];
      }
    }
  }

  columns.forEach((column, columnIndex) => {
    column.style.display = hiddenColumns.has(columnIndex) ? "none" : "";
  });
}
