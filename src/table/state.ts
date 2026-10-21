/**
 * Defines persistent per-table view state and its actions.
 * This module contains no DOM, browser API, or toolbar presentation behavior.
 */
import { addUniqueSortedIndex, clampInteger } from "./utils";

export type FreezeOptions = {
  rows: number;
  columns: number;
};

export type SortDirection = "ascending" | "descending";

export type TableSort = {
  column: number;
  direction: SortDirection;
} | null;

export type TableViewState = {
  freeze: FreezeOptions;
  hiddenRows: readonly number[];
  hiddenColumns: readonly number[];
  filterQuery: string;
  filterUsesRegularExpression: boolean;
  sort: TableSort;
  isWrapped: boolean;
  columnWidths: readonly number[] | null;
  rowSelection: { rows: readonly number[]; selected: readonly number[] } | null;
};

export type TableViewAction =
  | { type: "rowSelectionStarted"; rows: readonly number[] }
  | { type: "rowSelectionToggled"; index: number }
  | { type: "rowSelectionAllToggled" }
  | { type: "rowSelectionApplied" }
  | { type: "rowSelectionCancelled" }
  | { type: "freezeChanged"; value: FreezeOptions }
  | { type: "columnHidden"; index: number }
  | { type: "hiddenShown" }
  | { type: "filterQueryChanged"; value: string }
  | { type: "filterRegularExpressionChanged"; value: boolean }
  | { type: "sortChanged"; value: TableSort }
  | { type: "wrapChanged"; value: boolean }
  | { type: "columnWidthsChanged"; value: readonly number[] }
  | { type: "fitApplied"; widths: readonly number[] }
  | { type: "reset" };

export function createInitialTableViewState(): TableViewState {
  return {
    freeze: { rows: 0, columns: 0 },
    hiddenRows: [],
    hiddenColumns: [],
    filterQuery: "",
    filterUsesRegularExpression: false,
    sort: null,
    isWrapped: false,
    columnWidths: null,
    rowSelection: null,
  };
}

function clampFreezeOptions(value: FreezeOptions, limits: FreezeOptions): FreezeOptions {
  return {
    rows: clampInteger(value.rows, 0, limits.rows),
    columns: clampInteger(value.columns, 0, limits.columns),
  };
}

export function reduceTableViewState(
  state: TableViewState,
  action: TableViewAction,
  limits: FreezeOptions,
): TableViewState {
  switch (action.type) {
    case "rowSelectionStarted": {
      const rows = [...new Set(action.rows)].filter(
        (index) => Number.isInteger(index) && index >= 0,
      );
      return { ...state, rowSelection: { rows, selected: [...rows] } };
    }
    case "rowSelectionToggled": {
      const selection = state.rowSelection;
      if (!selection?.rows.includes(action.index)) return state;
      const selected = selection.selected.includes(action.index)
        ? selection.selected.filter((index) => index !== action.index)
        : [...selection.selected, action.index];
      return { ...state, rowSelection: { ...selection, selected } };
    }
    case "rowSelectionAllToggled": {
      const selection = state.rowSelection;
      if (!selection) return state;
      return {
        ...state,
        rowSelection: {
          ...selection,
          selected: selection.selected.length === selection.rows.length ? [] : [...selection.rows],
        },
      };
    }
    case "rowSelectionApplied": {
      const selection = state.rowSelection;
      if (!selection) return state;
      const selected = new Set(selection.selected);
      return {
        ...state,
        hiddenRows: [
          ...new Set([
            ...state.hiddenRows,
            ...selection.rows.filter((index) => !selected.has(index)),
          ]),
        ].sort((a, b) => a - b),
        rowSelection: null,
      };
    }
    case "rowSelectionCancelled":
      return { ...state, rowSelection: null };
    case "freezeChanged":
      return { ...state, freeze: clampFreezeOptions(action.value, limits) };
    case "columnHidden":
      return {
        ...state,
        rowSelection: null,
        hiddenColumns: addUniqueSortedIndex(state.hiddenColumns, action.index),
      };
    case "hiddenShown":
      return { ...state, hiddenRows: [], hiddenColumns: [], rowSelection: null };
    case "filterQueryChanged":
      return { ...state, filterQuery: action.value, rowSelection: null };
    case "filterRegularExpressionChanged":
      return { ...state, filterUsesRegularExpression: action.value, rowSelection: null };
    case "sortChanged":
      return { ...state, sort: action.value };
    case "wrapChanged":
      return { ...state, isWrapped: action.value };
    case "columnWidthsChanged":
      return { ...state, columnWidths: [...action.value] };
    case "fitApplied":
      return { ...state, isWrapped: true, columnWidths: [...action.widths] };
    case "reset":
      return createInitialTableViewState();
  }
}
