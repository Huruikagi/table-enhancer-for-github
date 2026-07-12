/**
 * Composes one table's controller, DOM interactions, Preact controls, and external adapters.
 * State transition rules remain in the controller and state modules.
 */
import { createTableController, type TableController } from "./controller";
import { createTableControls, destroyTableControls } from "./controls";
import { type CopyFormat, copyVisibleTable } from "./features/copy";
import {
  getHideControlClick,
  installTableHideControls,
  resetTableHideControls,
} from "./features/hide-controls";
import {
  installColumnResizeBehavior,
  installTableColumnResizeControls,
  measureFitTableColumnWidths,
  resetTableColumnResizeControls,
} from "./features/resize";
import {
  getNextTableSort,
  getSortColumnClick,
  installTableSortControls,
  resetTableSortControls,
} from "./features/sort";
import { reconcileTable } from "./reconcile";
import type { FreezeOptions } from "./state";

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

  installTableHideControls(table);
  installTableColumnResizeControls(table);
  installTableSortControls(table);
  reconcileTable(table, null, controller.getState());

  const removeProjection = controller.subscribe((state, previousState) => {
    reconcileTable(table, previousState, state);
  });
  const handleClick = (event: MouseEvent): void => {
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
    controller.dispatch(
      hideControlClick.action === "hide-row"
        ? { type: "rowHidden", index: hideControlClick.index }
        : { type: "columnHidden", index: hideControlClick.index },
    );
  };

  table.addEventListener("click", handleClick);
  const removeResizeBehavior = installColumnResizeBehavior(table, (widths) => {
    controller.dispatch({ type: "columnWidthsChanged", value: widths });
  });
  const controls = createTableControls({
    controller,
    headingText: options.headingText,
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
      table.removeEventListener("click", handleClick);
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
