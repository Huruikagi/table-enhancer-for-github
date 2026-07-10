import type { VNode } from "preact";
import { render } from "preact";
import { useId, useLayoutEffect, useRef, useState } from "preact/hooks";
import {
  TABLE_CONTROLS_CLASS,
  TABLE_CONTROLS_TAG,
  TABLE_CONTROLS_TOGGLE_CLASS,
  WRAPPED_COLUMNS_DATA_ATTRIBUTE,
} from "./table-constants";
import { FilterPanel, FreezePanel, type SaveDefaultStatus } from "./table-control-panels";
import type { FreezeOptions } from "./table-freeze";
import {
  getHideControlClick,
  installTableHideControls,
  resetTableHideControls,
} from "./table-hide-controls";
import {
  fitTableColumnWidths,
  installColumnResizeBehavior,
  installTableColumnResizeControls,
  resetTableColumnResize,
  resetTableColumnResizeControls,
} from "./table-resize";
import { addUniqueSortedIndex, clampInteger } from "./table-utils";
import { applyTableVisibility } from "./table-visibility";

type TableControlsProps = {
  defaultValuesPromise?: Promise<FreezeOptions | null> | null;
  headingText?: string | null;
  table: HTMLTableElement;
  limits: FreezeOptions;
  onChange: (values: FreezeOptions) => void;
  onSaveDefault?: (values: FreezeOptions) => Promise<void>;
};

function applyTableWrap(table: HTMLTableElement, isWrapped: boolean): void {
  if (isWrapped) {
    table.dataset[WRAPPED_COLUMNS_DATA_ATTRIBUTE] = "true";
  } else {
    delete table.dataset[WRAPPED_COLUMNS_DATA_ATTRIBUTE];
  }
}

function TableControls({
  defaultValuesPromise,
  headingText,
  limits,
  onChange,
  onSaveDefault,
  table,
}: TableControlsProps): VNode {
  const inputIdPrefix = useId();
  const hasUserEditedValues = useRef(false);
  const freezeToggleRef = useRef<HTMLButtonElement>(null);
  const rowsInputRef = useRef<HTMLInputElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [values, setValues] = useState<FreezeOptions>({ rows: 0, columns: 0 });
  const [hiddenRows, setHiddenRows] = useState<readonly number[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<readonly number[]>([]);
  const [isWrapped, setIsWrapped] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [saveDefaultStatus, setSaveDefaultStatus] = useState<SaveDefaultStatus>("idle");
  const hiddenCount = hiddenRows.length + hiddenColumns.length;

  const applyValues = (nextValues: FreezeOptions): FreezeOptions => {
    const clampedValues = {
      rows: clampInteger(nextValues.rows, 0, limits.rows),
      columns: clampInteger(nextValues.columns, 0, limits.columns),
    };

    setValues(clampedValues);
    onChange(clampedValues);

    return clampedValues;
  };

  const updateValues = (nextValues: FreezeOptions): FreezeOptions => {
    hasUserEditedValues.current = true;
    setSaveDefaultStatus("idle");

    return applyValues(nextValues);
  };

  const showHidden = (): void => {
    setHiddenRows([]);
    setHiddenColumns([]);
  };

  const fitTableView = (): void => {
    setIsWrapped(true);
    applyTableWrap(table, true);
    fitTableColumnWidths(table, new Set(hiddenColumns));
    onChange(values);
  };

  const resetTableView = (): void => {
    hasUserEditedValues.current = true;
    setSaveDefaultStatus("idle");
    setHiddenRows([]);
    setHiddenColumns([]);
    setIsWrapped(false);
    setFilterQuery("");
    applyTableWrap(table, false);
    applyTableVisibility(table, { rows: [], columns: [], filterQuery: "" });
    resetTableColumnResize(table);
    applyValues({ rows: 0, columns: 0 });
  };

  const toggleWrap = (): void => {
    const nextIsWrapped = !isWrapped;

    setIsWrapped(nextIsWrapped);
    applyTableWrap(table, nextIsWrapped);
    onChange(values);
  };

  const saveDefault = async (): Promise<void> => {
    if (!onSaveDefault) {
      return;
    }

    setSaveDefaultStatus("saving");

    try {
      await onSaveDefault(values);
      setSaveDefaultStatus("saved");
      window.setTimeout(() => {
        setSaveDefaultStatus((currentStatus) =>
          currentStatus === "saved" ? "idle" : currentStatus,
        );
      }, 1500);
    } catch {
      setSaveDefaultStatus("failed");
    }
  };

  useLayoutEffect(() => {
    let isCanceled = false;

    defaultValuesPromise?.then((defaultValues) => {
      if (!defaultValues || isCanceled || hasUserEditedValues.current) {
        return;
      }

      applyValues(defaultValues);
    });

    return () => {
      isCanceled = true;
    };
  }, [defaultValuesPromise]);

  useLayoutEffect(() => {
    installTableHideControls(table);
    installTableColumnResizeControls(table);

    const handleClick = (event: MouseEvent): void => {
      const hideControlClick = getHideControlClick(table, event.target);

      if (!hideControlClick) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (hideControlClick.action === "hide-row") {
        setHiddenRows((currentValue) => addUniqueSortedIndex(currentValue, hideControlClick.index));
      }

      if (hideControlClick.action === "hide-column") {
        setHiddenColumns((currentValue) =>
          addUniqueSortedIndex(currentValue, hideControlClick.index),
        );
      }
    };

    table.addEventListener("click", handleClick);

    return () => {
      table.removeEventListener("click", handleClick);
      resetTableHideControls(table);
      resetTableColumnResizeControls(table);
    };
  }, [table]);

  useLayoutEffect(() => {
    applyTableVisibility(table, {
      rows: hiddenRows,
      columns: hiddenColumns,
      filterQuery,
    });
    onChange(values);
  }, [filterQuery, hiddenRows, hiddenColumns, onChange, table, values]);

  useLayoutEffect(
    () => installColumnResizeBehavior(table, () => onChange(values)),
    [onChange, table, values],
  );

  useLayoutEffect(() => {
    if (isOpen) {
      rowsInputRef.current?.focus();
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (isFilterOpen) {
      filterInputRef.current?.focus();
    }
  }, [isFilterOpen]);

  const closeFreezePanel = (): void => {
    setIsOpen(false);
    freezeToggleRef.current?.focus();
  };

  const toggleFreezePanel = (): void => {
    setIsOpen((currentValue) => {
      if (!currentValue) {
        setIsFilterOpen(false);
      }

      return !currentValue;
    });
  };

  const toggleFilterPanel = (): void => {
    setIsFilterOpen((currentValue) => {
      if (!currentValue) {
        setIsOpen(false);
      }

      return !currentValue;
    });
  };

  return (
    <>
      <button
        aria-expanded={isOpen}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={toggleFreezePanel}
        ref={freezeToggleRef}
        type="button"
      >
        Freeze
      </button>
      <button className={TABLE_CONTROLS_TOGGLE_CLASS} onClick={fitTableView} type="button">
        Fit
      </button>
      <button
        aria-pressed={isWrapped}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={toggleWrap}
        type="button"
      >
        Wrap
      </button>
      <button
        aria-expanded={isFilterOpen}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={toggleFilterPanel}
        type="button"
      >
        Filter
      </button>
      {hiddenCount > 0 && (
        <button className={TABLE_CONTROLS_TOGGLE_CLASS} onClick={showHidden} type="button">
          Show hidden
        </button>
      )}
      <button className={TABLE_CONTROLS_TOGGLE_CLASS} onClick={resetTableView} type="button">
        Reset table view
      </button>

      {isFilterOpen && (
        <FilterPanel
          filterInputRef={filterInputRef}
          filterQuery={filterQuery}
          inputIdPrefix={inputIdPrefix}
          onFilterQueryChange={setFilterQuery}
        />
      )}
      {isOpen && (
        <FreezePanel
          headingText={headingText}
          inputIdPrefix={inputIdPrefix}
          limits={limits}
          onClose={closeFreezePanel}
          onSaveDefault={onSaveDefault ? saveDefault : undefined}
          onUpdateValues={updateValues}
          rowsInputRef={rowsInputRef}
          saveDefaultStatus={saveDefaultStatus}
          values={values}
        />
      )}
    </>
  );
}

export function createTableControls(
  table: HTMLTableElement,
  onChange: (values: FreezeOptions) => void,
  options: Pick<TableControlsProps, "defaultValuesPromise" | "headingText" | "onSaveDefault"> = {},
): HTMLElement {
  const controls = document.createElement(TABLE_CONTROLS_TAG);
  controls.classList.add(TABLE_CONTROLS_CLASS);
  render(
    <TableControls
      defaultValuesPromise={options.defaultValuesPromise}
      headingText={options.headingText}
      table={table}
      limits={{
        rows: table.rows.length,
        columns: table.rows[0]?.cells.length ?? 0,
      }}
      onChange={onChange}
      onSaveDefault={options.onSaveDefault}
    />,
    controls,
  );

  return controls;
}
