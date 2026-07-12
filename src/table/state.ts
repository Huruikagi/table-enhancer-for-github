import type { FreezeOptions } from "./freeze";
import type { TableSort } from "./sort";
import { addUniqueSortedIndex, clampInteger } from "./utils";

export type TableViewState = {
  freeze: FreezeOptions;
  hiddenRows: readonly number[];
  hiddenColumns: readonly number[];
  filterQuery: string;
  filterUsesRegularExpression: boolean;
  sort: TableSort;
  isWrapped: boolean;
  columnWidths: readonly number[] | null;
};

export type TableViewAction =
  | { type: "freezeChanged"; value: FreezeOptions }
  | { type: "rowHidden"; index: number }
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
    case "freezeChanged":
      return { ...state, freeze: clampFreezeOptions(action.value, limits) };
    case "rowHidden":
      return { ...state, hiddenRows: addUniqueSortedIndex(state.hiddenRows, action.index) };
    case "columnHidden":
      return {
        ...state,
        hiddenColumns: addUniqueSortedIndex(state.hiddenColumns, action.index),
      };
    case "hiddenShown":
      return { ...state, hiddenRows: [], hiddenColumns: [] };
    case "filterQueryChanged":
      return { ...state, filterQuery: action.value };
    case "filterRegularExpressionChanged":
      return { ...state, filterUsesRegularExpression: action.value };
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
