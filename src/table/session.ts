import { createTableControls, destroyTableControls } from "./controls";
import { type CopyFormat, copyVisibleTable } from "./copy";
import type { FreezeOptions } from "./freeze";
import {
  getHideControlClick,
  installTableHideControls,
  resetTableHideControls,
} from "./hide-controls";
import { reconcileTable } from "./reconcile";
import {
  installColumnResizeBehavior,
  installTableColumnResizeControls,
  measureFitTableColumnWidths,
  resetTableColumnResizeControls,
} from "./resize";
import {
  getNextTableSort,
  getSortColumnClick,
  installTableSortControls,
  resetTableSortControls,
} from "./sort";
import {
  createInitialTableViewState,
  reduceTableViewState,
  type TableViewAction,
  type TableViewState,
} from "./state";

export type TableSessionOptions = {
  copy?: (table: HTMLTableElement, format: CopyFormat) => Promise<void>;
  defaultValuesPromise?: Promise<FreezeOptions | null> | null;
  headingText?: string | null;
  onSaveDefault?: (values: FreezeOptions) => Promise<void>;
};

export type TableStateListener = (state: TableViewState) => void;

export type TableSession = {
  readonly table: HTMLTableElement;
  readonly controls: HTMLElement;
  readonly limits: FreezeOptions;
  readonly headingText?: string | null;
  getState: () => TableViewState;
  dispatch: (action: TableViewAction) => void;
  subscribe: (listener: TableStateListener) => () => void;
  fitColumns: () => void;
  copy: (format: CopyFormat) => Promise<void>;
  saveDefault?: () => Promise<void>;
  destroy: () => void;
};

export function createTableSession(
  table: HTMLTableElement,
  options: TableSessionOptions = {},
): TableSession {
  const limits = {
    rows: Math.min(table.rows.length, 5),
    columns: Math.min(table.rows[0]?.cells.length ?? 0, 5),
  };
  const listeners = new Set<TableStateListener>();
  let state = createInitialTableViewState();
  let isDestroyed = false;
  let hasUserEditedFreeze = false;

  const applyAction = (action: TableViewAction, isUserAction: boolean): void => {
    if (isDestroyed) {
      return;
    }

    if (isUserAction && (action.type === "freezeChanged" || action.type === "reset")) {
      hasUserEditedFreeze = true;
    }

    const previousState = state;
    state = reduceTableViewState(state, action, limits);
    reconcileTable(table, previousState, state);
    listeners.forEach((listener) => {
      listener(state);
    });
  };

  installTableHideControls(table);
  installTableColumnResizeControls(table);
  installTableSortControls(table);
  reconcileTable(table, null, state);

  const handleClick = (event: MouseEvent): void => {
    const sortColumn = getSortColumnClick(table, event.target);
    const hideControlClick = getHideControlClick(table, event.target);

    if (sortColumn !== null) {
      event.preventDefault();
      event.stopPropagation();
      applyAction({ type: "sortChanged", value: getNextTableSort(state.sort, sortColumn) }, true);
      return;
    }

    if (!hideControlClick) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    applyAction(
      hideControlClick.action === "hide-row"
        ? { type: "rowHidden", index: hideControlClick.index }
        : { type: "columnHidden", index: hideControlClick.index },
      true,
    );
  };

  table.addEventListener("click", handleClick);
  const removeResizeBehavior = installColumnResizeBehavior(table, (widths) => {
    applyAction({ type: "columnWidthsChanged", value: widths }, true);
  });

  let controls: HTMLElement;
  const session: TableSession = {
    table,
    get controls() {
      return controls;
    },
    limits,
    headingText: options.headingText,
    getState: () => state,
    dispatch: (action) => applyAction(action, true),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    fitColumns: () => {
      applyAction({ type: "fitApplied", widths: measureFitTableColumnWidths(table) }, true);
    },
    copy: (format) => (options.copy ?? copyVisibleTable)(table, format),
    saveDefault: options.onSaveDefault
      ? () => options.onSaveDefault?.(state.freeze) ?? Promise.resolve()
      : undefined,
    destroy: () => {
      if (isDestroyed) {
        return;
      }

      const previousState = state;
      state = createInitialTableViewState();
      reconcileTable(table, previousState, state);
      isDestroyed = true;
      table.removeEventListener("click", handleClick);
      removeResizeBehavior();
      destroyTableControls(controls);
      resetTableHideControls(table);
      resetTableColumnResizeControls(table);
      resetTableSortControls(table);
      listeners.clear();
      delete table.dataset.githubTableEnhancer;
    },
  };

  controls = createTableControls(session);

  options.defaultValuesPromise
    ?.then((defaultValues) => {
      if (defaultValues && !hasUserEditedFreeze) {
        applyAction({ type: "freezeChanged", value: defaultValues }, false);
      }
    })
    .catch(() => undefined);

  return session;
}
