/**
 * Composes one table's controller, DOM interactions, Preact controls, and external adapters.
 * State transition rules remain in the controller and state modules.
 */
import { createTableController, type TableController } from "./controller";
import { measureFitTableColumnWidths } from "./features/column-measurement";
import { type CopyFormat, copyVisibleTable } from "./features/copy";
import {
  getHideControlClick,
  installTableHideControls,
  resetTableHideControls,
} from "./features/hide-controls";
import { installTableHover } from "./features/hover";
import {
  installColumnResizeBehavior,
  installTableColumnResizeControls,
  resetTableColumnResizeControls,
} from "./features/resize";
import {
  getRowSelectionClick,
  getSelectableRows,
  ROW_SELECTION_CLASS,
} from "./features/row-selection";
import {
  getNextTableSort,
  getSortColumnClick,
  installTableSortControls,
  resetTableSortControls,
} from "./features/sort";
import { reconcileTable } from "./reconcile";
import { initializeOriginalRowIndexes } from "./row-dom";
import type { FreezeOptions } from "./state";
import { createTableControls, destroyTableControls } from "./ui/controls";

export type TableRuntimeOptions = {
  copy?: (table: HTMLTableElement, format: CopyFormat) => Promise<void>;
  defaultValuesPromise?: Promise<FreezeOptions | null> | null;
  headingText?: string | null;
  onSaveDefault?: (values: FreezeOptions) => Promise<void>;
};

export type TableRuntime = {
  readonly table: HTMLTableElement;
  readonly controls: HTMLElement;
  readonly controller: TableController;
  destroy: () => void;
};

export function mountTableRuntime(
  table: HTMLTableElement,
  options: TableRuntimeOptions = {},
): TableRuntime {
  const controller = createTableController({
    rows: Math.min(table.rows.length, 5),
    columns: Math.min(table.rows[0]?.cells.length ?? 0, 5),
  });
  let isDestroyed = false;

  initializeOriginalRowIndexes(table);
  installTableHideControls(table);
  installTableColumnResizeControls(table);
  installTableSortControls(table);
  reconcileTable(table, null, controller.getState());
  const hover = installTableHover(table);

  const removeProjection = controller.subscribe((state, previousState) => {
    reconcileTable(table, previousState, state);
    hover.refresh();
  });
  const handleClick = (event: MouseEvent): void => {
    const selection = getRowSelectionClick(table, event.target);
    if (selection !== null) {
      event.stopPropagation();
      controller.dispatch(
        selection === "all"
          ? { type: "rowSelectionAllToggled" }
          : { type: "rowSelectionToggled", index: selection },
      );
      return;
    }
    const sortColumn = getSortColumnClick(table, event.target);
    const hideControlClick = getHideControlClick(table, event.target);

    if (sortColumn !== null) {
      event.preventDefault();
      event.stopPropagation();
      controller.dispatch({
        type: "sortChanged",
        value: getNextTableSort(controller.getState().sort, sortColumn),
      });
      return;
    }

    if (!hideControlClick) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    controller.dispatch({ type: "columnHidden", index: hideControlClick.index });
  };

  table.addEventListener("click", handleClick);
  const removeResizeBehavior = installColumnResizeBehavior(table, (widths) => {
    controller.dispatch({ type: "columnWidthsChanged", value: widths });
  });
  const controls = createTableControls({
    controller,
    headingText: options.headingText,
    onSelectRows: () => {
      controller.dispatch({ type: "rowSelectionStarted", rows: getSelectableRows(table) });
      table.querySelector<HTMLInputElement>(`.${ROW_SELECTION_CLASS}`)?.focus();
    },
    onCopy: (format) => (options.copy ?? copyVisibleTable)(table, format),
    onFitColumns: () => {
      controller.dispatch({
        type: "fitApplied",
        widths: measureFitTableColumnWidths(table),
      });
    },
    onSaveDefault: options.onSaveDefault
      ? () => options.onSaveDefault?.(controller.getState().freeze) ?? Promise.resolve()
      : undefined,
    table,
  });
  const handleSelectionEscape = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !controller.getState().rowSelection) return;
    event.preventDefault();
    event.stopPropagation();
    controller.dispatch({ type: "rowSelectionCancelled" });
    controls.querySelector<HTMLButtonElement>("[data-gte-select-rows]")?.focus();
  };
  table.addEventListener("keydown", handleSelectionEscape);
  controls.addEventListener("keydown", handleSelectionEscape);

  options.defaultValuesPromise
    ?.then((defaultValues) => {
      if (defaultValues) {
        controller.applyDefaultFreeze(defaultValues);
      }
    })
    .catch(() => undefined);

  return {
    table,
    controls,
    controller,
    destroy: () => {
      if (isDestroyed) {
        return;
      }

      controller.dispatch({ type: "reset" });
      isDestroyed = true;
      hover.destroy();
      table.removeEventListener("click", handleClick);
      table.removeEventListener("keydown", handleSelectionEscape);
      controls.removeEventListener("keydown", handleSelectionEscape);
      removeResizeBehavior();
      removeProjection();
      destroyTableControls(controls);
      controls.remove();
      resetTableHideControls(table);
      resetTableColumnResizeControls(table);
      resetTableSortControls(table);
      controller.destroy();
      delete table.dataset.githubTableEnhancer;
    },
  };
}
