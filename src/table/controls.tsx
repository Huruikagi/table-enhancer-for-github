import type { VNode } from "preact";
import { render } from "preact";
import { useId, useLayoutEffect, useRef, useState } from "preact/hooks";
import {
  TABLE_CONTROLS_CLASS,
  TABLE_CONTROLS_TAG,
  TABLE_CONTROLS_TOGGLE_CLASS,
  WRAPPED_COLUMNS_DATA_ATTRIBUTE,
} from "./constants";
import { ControlIcon } from "./control-icons";
import { CopyPanel, FilterPanel, FreezePanel, type SaveDefaultStatus } from "./control-panels";
import { type CopyFormat, copyVisibleTable } from "./copy";
import { useTableFocusMode } from "./focus-mode";
import type { FreezeOptions } from "./freeze";
import {
  getHideControlClick,
  installTableHideControls,
  resetTableHideControls,
} from "./hide-controls";
import {
  fitTableColumnWidths,
  installColumnResizeBehavior,
  installTableColumnResizeControls,
  resetTableColumnResize,
  resetTableColumnResizeControls,
} from "./resize";
import {
  applyTableSort,
  getNextTableSort,
  getSortColumnClick,
  installTableSortControls,
  resetTableSortControls,
  type TableSort,
} from "./sort";
import { addUniqueSortedIndex, clampInteger } from "./utils";
import { applyTableVisibility, getFilterRegularExpressionError } from "./visibility";

type TableControlsProps = {
  defaultValuesPromise?: Promise<FreezeOptions | null> | null;
  headingText?: string | null;
  table: HTMLTableElement;
  limits: FreezeOptions;
  onChange: (values: FreezeOptions) => void;
  onSaveDefault?: (values: FreezeOptions) => Promise<void>;
};

type OpenPanel = "copy" | "filter" | "freeze" | null;

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
  const copyToggleRef = useRef<HTMLButtonElement>(null);
  const copyFirstButtonRef = useRef<HTMLButtonElement>(null);
  const freezeToggleRef = useRef<HTMLButtonElement>(null);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const focusToggleRef = useRef<HTMLButtonElement>(null);
  const rowsInputRef = useRef<HTMLInputElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [values, setValues] = useState<FreezeOptions>({ rows: 0, columns: 0 });
  const [hiddenRows, setHiddenRows] = useState<readonly number[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<readonly number[]>([]);
  const [isWrapped, setIsWrapped] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterUsesRegularExpression, setFilterUsesRegularExpression] = useState(false);
  const [sort, setSort] = useState<TableSort>(null);
  const [copyStatus, setCopyStatus] = useState<CopyFormat | "failed" | "idle">("idle");
  const [saveDefaultStatus, setSaveDefaultStatus] = useState<SaveDefaultStatus>("idle");
  const hiddenCount = hiddenRows.length + hiddenColumns.length;
  const anchorPrefix = `--gte-${inputIdPrefix.replace(/[^a-zA-Z0-9_-]/g, "")}`;

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
    setFilterUsesRegularExpression(false);
    setSort(null);
    applyTableWrap(table, false);
    applyTableVisibility(table, { rows: [], columns: [], filterQuery: "" });
    applyTableSort(table, null);
    resetTableColumnResize(table);
    applyValues({ rows: 0, columns: 0 });
  };

  const toggleWrap = (): void => {
    const nextIsWrapped = !isWrapped;

    setIsWrapped(nextIsWrapped);
    applyTableWrap(table, nextIsWrapped);
    onChange(values);
  };

  const copyTable = async (format: CopyFormat): Promise<void> => {
    try {
      await copyVisibleTable(table, format);
      setCopyStatus(format);
      window.setTimeout(() => {
        setCopyStatus((currentStatus) => (currentStatus === format ? "idle" : currentStatus));
      }, 1500);
    } catch {
      setCopyStatus("failed");
    }
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
    installTableSortControls(table);

    const handleClick = (event: MouseEvent): void => {
      const hideControlClick = getHideControlClick(table, event.target);
      const sortColumn = getSortColumnClick(table, event.target);

      if (sortColumn !== null) {
        event.preventDefault();
        event.stopPropagation();
        setSort((currentSort) => getNextTableSort(currentSort, sortColumn));
        return;
      }

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
      resetTableSortControls(table);
    };
  }, [table]);

  useLayoutEffect(() => {
    applyTableVisibility(table, {
      rows: hiddenRows,
      columns: hiddenColumns,
      filterQuery,
      filterUsesRegularExpression,
    });
    onChange(values);
  }, [
    filterQuery,
    filterUsesRegularExpression,
    hiddenRows,
    hiddenColumns,
    onChange,
    table,
    values,
  ]);

  useLayoutEffect(() => {
    applyTableSort(table, sort);
    onChange(values);
  }, [onChange, sort, table, values]);

  useLayoutEffect(
    () => installColumnResizeBehavior(table, () => onChange(values)),
    [onChange, table, values],
  );

  useLayoutEffect(() => {
    if (openPanel === "copy") {
      copyFirstButtonRef.current?.focus();
    }
  }, [openPanel]);

  useLayoutEffect(() => {
    if (openPanel === "freeze") {
      rowsInputRef.current?.focus();
    }
  }, [openPanel]);

  useLayoutEffect(() => {
    if (openPanel === "filter") {
      filterInputRef.current?.focus();
    }
  }, [openPanel]);

  useTableFocusMode(table, isFocusMode, setIsFocusMode, focusToggleRef);

  const closeFreezePanel = (): void => {
    setOpenPanel(null);
    freezeToggleRef.current?.focus();
  };

  const closeCopyPanel = (): void => {
    setOpenPanel(null);
    copyToggleRef.current?.focus();
  };

  const closeFilterPanel = (): void => {
    setOpenPanel(null);
    filterToggleRef.current?.focus();
  };

  const toggleCopyPanel = (): void => {
    setOpenPanel((currentPanel) => (currentPanel === "copy" ? null : "copy"));
  };

  const toggleFreezePanel = (): void => {
    setOpenPanel((currentPanel) => (currentPanel === "freeze" ? null : "freeze"));
  };

  const toggleFilterPanel = (): void => {
    setOpenPanel((currentPanel) => (currentPanel === "filter" ? null : "filter"));
  };

  const toggleFocusMode = (): void => {
    setIsFocusMode((currentValue) => !currentValue);
  };

  return (
    <>
      {isFocusMode && (
        <div aria-live="polite" className="github-table-enhancer-focus-mode-status">
          <strong>Focus mode</strong>
          <span>Press</span>
          <kbd>Esc</kbd>
          <span>to return</span>
        </div>
      )}
      <button
        aria-expanded={openPanel === "freeze"}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={toggleFreezePanel}
        ref={freezeToggleRef}
        style={{ anchorName: `${anchorPrefix}-freeze` }}
        type="button"
      >
        Freeze
      </button>
      <button
        aria-expanded={openPanel === "filter"}
        aria-label="Filter"
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={toggleFilterPanel}
        ref={filterToggleRef}
        style={{ anchorName: `${anchorPrefix}-filter` }}
        title="Filter rows"
        type="button"
      >
        <ControlIcon kind="filter" />
      </button>
      <button
        aria-expanded={openPanel === "copy"}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={toggleCopyPanel}
        ref={copyToggleRef}
        style={{ anchorName: `${anchorPrefix}-copy` }}
        type="button"
      >
        Copy as
      </button>
      <button
        aria-label="Fit"
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={fitTableView}
        title="Fit columns"
        type="button"
      >
        <ControlIcon kind="fit" />
      </button>
      <button
        aria-label="Wrap"
        aria-pressed={isWrapped}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={toggleWrap}
        title="Wrap columns"
        type="button"
      >
        <ControlIcon kind="wrap" />
      </button>
      {hiddenCount > 0 && (
        <button
          aria-label="Show hidden"
          className={TABLE_CONTROLS_TOGGLE_CLASS}
          onClick={showHidden}
          title="Show hidden rows and columns"
          type="button"
        >
          <ControlIcon kind="show" />
        </button>
      )}
      <button
        aria-label="Reset table view"
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={resetTableView}
        title="Reset table view"
        type="button"
      >
        <ControlIcon kind="reset" />
      </button>
      <button
        aria-label={isFocusMode ? "Close" : "Expand"}
        aria-pressed={isFocusMode}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={toggleFocusMode}
        ref={focusToggleRef}
        title={isFocusMode ? "Close Focus mode (Esc)" : "Expand table view"}
        type="button"
      >
        <ControlIcon kind="expand" />
      </button>

      {openPanel === "copy" && (
        <CopyPanel
          firstButtonRef={copyFirstButtonRef}
          onCopy={copyTable}
          onEscape={closeCopyPanel}
          positionAnchor={`${anchorPrefix}-copy`}
          status={copyStatus}
        />
      )}
      {openPanel === "filter" && (
        <FilterPanel
          filterInputRef={filterInputRef}
          filterQuery={filterQuery}
          filterRegularExpressionError={
            filterUsesRegularExpression ? getFilterRegularExpressionError(filterQuery) : null
          }
          filterUsesRegularExpression={filterUsesRegularExpression}
          inputIdPrefix={inputIdPrefix}
          onEscape={closeFilterPanel}
          onFilterQueryChange={setFilterQuery}
          onFilterUsesRegularExpressionChange={setFilterUsesRegularExpression}
          positionAnchor={`${anchorPrefix}-filter`}
        />
      )}
      {openPanel === "freeze" && (
        <FreezePanel
          headingText={headingText}
          inputIdPrefix={inputIdPrefix}
          limits={limits}
          onClose={closeFreezePanel}
          onSaveDefault={onSaveDefault ? saveDefault : undefined}
          onUpdateValues={updateValues}
          positionAnchor={`${anchorPrefix}-freeze`}
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
