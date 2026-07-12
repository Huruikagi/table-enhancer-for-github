/**
 * Projects table state changes onto the DOM in the required cross-feature order.
 * This module coordinates projections but does not own state or browser event listeners.
 */
import { WRAPPED_COLUMNS_DATA_ATTRIBUTE } from "./constants";
import { applyTableFreeze } from "./features/freeze";
import { applyTableColumnWidths } from "./features/resize";
import { applyTableSort } from "./features/sort";
import { applyTableVisibility } from "./features/visibility";
import type { TableViewState } from "./state";

function applyTableWrap(table: HTMLTableElement, isWrapped: boolean): void {
  if (isWrapped) {
    table.dataset[WRAPPED_COLUMNS_DATA_ATTRIBUTE] = "true";
  } else {
    delete table.dataset[WRAPPED_COLUMNS_DATA_ATTRIBUTE];
  }
}

export function reconcileTable(
  table: HTMLTableElement,
  previousState: TableViewState | null,
  state: TableViewState,
): void {
  const sortChanged = !previousState || previousState.sort !== state.sort;
  const visibilityChanged =
    !previousState ||
    previousState.hiddenRows !== state.hiddenRows ||
    previousState.hiddenColumns !== state.hiddenColumns ||
    previousState.filterQuery !== state.filterQuery ||
    previousState.filterUsesRegularExpression !== state.filterUsesRegularExpression;
  const wrapChanged = !previousState || previousState.isWrapped !== state.isWrapped;
  const widthsChanged =
    previousState !== null &&
    (previousState.columnWidths !== state.columnWidths ||
      previousState.hiddenColumns !== state.hiddenColumns);
  const freezeChanged = !previousState || previousState.freeze !== state.freeze;

  if (sortChanged) {
    applyTableSort(table, state.sort);
  }

  if (sortChanged || visibilityChanged) {
    applyTableVisibility(table, {
      rows: state.hiddenRows,
      columns: state.hiddenColumns,
      filterQuery: state.filterQuery,
      filterUsesRegularExpression: state.filterUsesRegularExpression,
    });
  }

  if (wrapChanged) {
    applyTableWrap(table, state.isWrapped);
  }

  if (widthsChanged || (!previousState && state.columnWidths)) {
    applyTableColumnWidths(table, state.columnWidths, new Set(state.hiddenColumns));
  }

  if (sortChanged || visibilityChanged || wrapChanged || widthsChanged || freezeChanged) {
    applyTableFreeze(table, state.freeze);
  }
}
