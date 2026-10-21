import { translate } from "../../i18n";
import {
  FILTERED_ROW_DATA_ATTRIBUTE,
  HIDDEN_COLUMN_DATA_ATTRIBUTE,
  HIDDEN_ROW_DATA_ATTRIBUTE,
} from "../constants";
import { getOriginalRowIndex, initializeOriginalRowIndexes, isHeaderRow } from "../row-dom";

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
    return translate("invalidRegularExpression");
  }
}

function isFilteredRow(
  table: HTMLTableElement,
  row: HTMLTableRowElement,
  matchesFilter: ((text: string) => boolean) | null,
): boolean {
  if (!matchesFilter || isHeaderRow(table, row)) {
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
  const filterQuery = visibility.filterQuery ?? "";
  const matchesFilter = createFilterMatcher(filterQuery, visibility.filterUsesRegularExpression);

  if (!matchesFilter) {
    return null;
  }

  const hiddenRows = new Set(visibility.rows);
  let matchingRows = 0;
  let totalRows = 0;
  let visibleRows = 0;

  for (const row of Array.from(table.rows)) {
    if (isHeaderRow(table, row)) {
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

  for (const row of Array.from(table.rows)) {
    if (hiddenRows.has(getOriginalRowIndex(row))) {
      row.dataset[HIDDEN_ROW_DATA_ATTRIBUTE] = "true";
    } else {
      delete row.dataset[HIDDEN_ROW_DATA_ATTRIBUTE];
    }

    if (isFilteredRow(table, row, matchesFilter)) {
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
