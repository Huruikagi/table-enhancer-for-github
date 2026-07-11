import type { VNode } from "preact";
import { render } from "preact";
import { useId, useLayoutEffect, useRef, useState } from "preact/hooks";
import {
  FOCUS_MODE_BODY_CLASS,
  FOCUS_MODE_CONTROLS_HEIGHT_PROPERTY,
  FOCUS_MODE_DATA_ATTRIBUTE,
  TABLE_CONTROLS_CLASS,
  TABLE_CONTROLS_TAG,
  TABLE_CONTROLS_TOGGLE_CLASS,
  WRAPPED_COLUMNS_DATA_ATTRIBUTE,
} from "./constants";
import { CopyPanel, FilterPanel, FreezePanel, type SaveDefaultStatus } from "./control-panels";
import { type CopyFormat, copyVisibleTable } from "./copy";
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

type ControlIconKind = "expand" | "filter" | "fit" | "reset" | "show" | "wrap";

const CONTROL_ICON_PATHS: Record<ControlIconKind, string> = {
  expand: "M3 8V3h5M16 8V3h-5M3 12v5h5M16 12v5h-5",
  filter: "M3 4h14l-5.5 6.2V16l-3 1v-6.8z",
  fit: "M7 3H3v4M13 3h4v4M7 17H3v-4M13 17h4v-4M6 10h8",
  reset: "M4.5 3v3.5H8M4.5 6.5A7 7 0 1 1 3 12",
  show: "M2.5 10s3-5 7.5-5 7.5 5 7.5 5-3 5-7.5 5S2.5 10 2.5 10Zm7.5 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  wrap: "M3 5h9.5a4.5 4.5 0 0 1 0 9H8m0 0 3-3m-3 3 3 3M3 9h7",
};

function ControlIcon({ kind }: { kind: ControlIconKind }): VNode {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <path d={CONTROL_ICON_PATHS[kind]} />
    </svg>
  );
}

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
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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
    if (isCopyOpen) {
      copyFirstButtonRef.current?.focus();
    }
  }, [isCopyOpen]);

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

  useLayoutEffect(() => {
    const wrapper = table.closest<HTMLElement>(`.github-table-enhancer-scroll`);

    if (!wrapper) {
      return;
    }

    const closeFocusMode = (): void => {
      setIsFocusMode(false);
      focusToggleRef.current?.focus();
    };
    const controls = wrapper.querySelector<HTMLElement>(`.${TABLE_CONTROLS_CLASS}`);
    const updateControlsHeight = (): void => {
      if (!controls) {
        return;
      }

      const marginBottom = Number.parseFloat(getComputedStyle(controls).marginBottom) || 0;
      wrapper.style.setProperty(
        FOCUS_MODE_CONTROLS_HEIGHT_PROPERTY,
        `${controls.getBoundingClientRect().height + marginBottom}px`,
      );
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeFocusMode();
      }
    };

    let controlsResizeObserver: ResizeObserver | undefined;

    if (isFocusMode) {
      wrapper.dataset[FOCUS_MODE_DATA_ATTRIBUTE] = "true";
      document.body.classList.add(FOCUS_MODE_BODY_CLASS);
      document.addEventListener("keydown", handleKeyDown);
      updateControlsHeight();

      if (typeof ResizeObserver !== "undefined" && controls) {
        controlsResizeObserver = new ResizeObserver(updateControlsHeight);
        controlsResizeObserver.observe(controls);
      }
    } else {
      delete wrapper.dataset[FOCUS_MODE_DATA_ATTRIBUTE];
      document.body.classList.remove(FOCUS_MODE_BODY_CLASS);
      wrapper.style.removeProperty(FOCUS_MODE_CONTROLS_HEIGHT_PROPERTY);
    }

    return () => {
      delete wrapper.dataset[FOCUS_MODE_DATA_ATTRIBUTE];
      document.body.classList.remove(FOCUS_MODE_BODY_CLASS);
      wrapper.style.removeProperty(FOCUS_MODE_CONTROLS_HEIGHT_PROPERTY);
      document.removeEventListener("keydown", handleKeyDown);
      controlsResizeObserver?.disconnect();
    };
  }, [isFocusMode, table]);

  const closeFreezePanel = (): void => {
    setIsOpen(false);
    freezeToggleRef.current?.focus();
  };

  const closeCopyPanel = (): void => {
    setIsCopyOpen(false);
    copyToggleRef.current?.focus();
  };

  const closeFilterPanel = (): void => {
    setIsFilterOpen(false);
    filterToggleRef.current?.focus();
  };

  const toggleCopyPanel = (): void => {
    setIsCopyOpen((currentValue) => {
      if (!currentValue) {
        setIsOpen(false);
        setIsFilterOpen(false);
      }

      return !currentValue;
    });
  };

  const toggleFreezePanel = (): void => {
    setIsOpen((currentValue) => {
      if (!currentValue) {
        setIsCopyOpen(false);
        setIsFilterOpen(false);
      }

      return !currentValue;
    });
  };

  const toggleFilterPanel = (): void => {
    setIsFilterOpen((currentValue) => {
      if (!currentValue) {
        setIsCopyOpen(false);
        setIsOpen(false);
      }

      return !currentValue;
    });
  };

  const toggleFocusMode = (): void => {
    setIsFocusMode((currentValue) => !currentValue);
  };

  return (
    <>
      <button
        aria-expanded={isOpen}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={toggleFreezePanel}
        ref={freezeToggleRef}
        style={{ anchorName: `${anchorPrefix}-freeze` }}
        type="button"
      >
        Freeze
      </button>
      <button
        aria-expanded={isFilterOpen}
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
        aria-expanded={isCopyOpen}
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
        title={isFocusMode ? "Close expanded view" : "Expand table view"}
        type="button"
      >
        <ControlIcon kind="expand" />
      </button>

      {isCopyOpen && (
        <CopyPanel
          firstButtonRef={copyFirstButtonRef}
          onCopy={copyTable}
          onEscape={closeCopyPanel}
          positionAnchor={`${anchorPrefix}-copy`}
          status={copyStatus}
        />
      )}
      {isFilterOpen && (
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
      {isOpen && (
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
