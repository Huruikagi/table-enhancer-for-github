import type { VNode } from "preact";
import { render } from "preact";
import { useId, useLayoutEffect, useRef, useState } from "preact/hooks";
import { translate } from "../../i18n";
import {
  TABLE_CONTROLS_CLASS,
  TABLE_CONTROLS_TAG,
  TABLE_CONTROLS_TOGGLE_CLASS,
} from "../constants";
import type { TableController } from "../controller";
import type { CopyFormat } from "../features/copy";
import { useTableFocusMode } from "../features/focus-mode";
import { getFilterRegularExpressionError, getTableFilterResult } from "../features/visibility";
import type { FreezeOptions } from "../state";
import { ControlIcon } from "./control-icons";
import { CopyPanel, FilterPanel, FreezePanel, type SaveDefaultStatus } from "./control-panels";

type TableControlsProps = {
  controller: TableController;
  headingText?: string | null;
  onCopy: (format: CopyFormat) => Promise<void>;
  onFitColumns: () => void;
  onSaveDefault?: () => Promise<void>;
  table: HTMLTableElement;
};

type OpenPanel = "copy" | "filter" | "freeze" | null;

function TableControls({
  controller,
  headingText,
  onCopy,
  onFitColumns,
  onSaveDefault,
  table,
}: TableControlsProps): VNode {
  const inputIdPrefix = useId();
  const copyToggleRef = useRef<HTMLButtonElement>(null);
  const copyFirstButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const freezeToggleRef = useRef<HTMLButtonElement>(null);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const focusToggleRef = useRef<HTMLButtonElement>(null);
  const rowsInputRef = useRef<HTMLInputElement>(null);
  const columnsInputRef = useRef<HTMLInputElement>(null);
  const saveDefaultButtonRef = useRef<HTMLButtonElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [viewState, setViewState] = useState(controller.getState());
  const [copyStatus, setCopyStatus] = useState<CopyFormat | "failed" | "idle">("idle");
  const [saveDefaultStatus, setSaveDefaultStatus] = useState<SaveDefaultStatus>("idle");
  const { filterQuery, filterUsesRegularExpression, freeze, hiddenColumns, hiddenRows, isWrapped } =
    viewState;
  const hiddenCount = hiddenRows.length + hiddenColumns.length;
  const filterResult = getTableFilterResult(table, {
    rows: hiddenRows,
    columns: hiddenColumns,
    filterQuery,
    filterUsesRegularExpression,
  });
  const filterResultSummary = filterResult
    ? filterResult.visibleRows === filterResult.matchingRows
      ? translate("filterSummaryAllVisible", [filterResult.matchingRows, filterResult.totalRows])
      : translate("filterSummarySomeVisible", [
          filterResult.visibleRows,
          filterResult.matchingRows,
          filterResult.totalRows,
        ])
    : null;
  const anchorPrefix = `--gte-${inputIdPrefix.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const applyValues = (nextValues: FreezeOptions): FreezeOptions => {
    controller.dispatch({ type: "freezeChanged", value: nextValues });
    return controller.getState().freeze;
  };

  const updateValues = (nextValues: FreezeOptions): FreezeOptions => {
    setSaveDefaultStatus("idle");

    return applyValues(nextValues);
  };

  const showHidden = (): void => {
    controller.dispatch({ type: "hiddenShown" });
  };

  const fitTableView = (): void => {
    onFitColumns();
  };

  const resetTableView = (): void => {
    setSaveDefaultStatus("idle");
    controller.dispatch({ type: "reset" });
  };

  const toggleWrap = (): void => {
    controller.dispatch({ type: "wrapChanged", value: !isWrapped });
  };

  const copyTable = async (format: CopyFormat): Promise<void> => {
    try {
      await onCopy(format);
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
      await onSaveDefault();
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

  useLayoutEffect(() => controller.subscribe((state) => setViewState(state)), [controller]);

  useLayoutEffect(() => {
    if (openPanel === "copy") {
      copyFirstButtonRef.current?.focus();
    }
  }, [openPanel]);

  useLayoutEffect(() => {
    if (openPanel === "freeze") {
      const rowsInput = rowsInputRef.current;
      rowsInput?.focus();
      rowsInput?.select();
    }
  }, [openPanel]);

  useLayoutEffect(() => {
    if (openPanel === "filter") {
      filterInputRef.current?.focus();
    }
  }, [openPanel]);

  useLayoutEffect(() => {
    if (openPanel === null) {
      return;
    }

    const activeToggle =
      openPanel === "copy"
        ? copyToggleRef.current
        : openPanel === "filter"
          ? filterToggleRef.current
          : freezeToggleRef.current;
    const handlePointerDown = (event: PointerEvent): void => {
      if (
        !(event.target instanceof Node) ||
        panelRef.current?.contains(event.target) ||
        activeToggle?.contains(event.target)
      ) {
        return;
      }

      setOpenPanel(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
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
          <strong>{translate("focusMode")}</strong>
          <span>{translate("focusModeInstructionBefore")}</span>
          <kbd>Esc</kbd>
          <span>{translate("focusModeInstructionAfter")}</span>
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
        {translate("freeze")}
      </button>
      <button
        aria-expanded={openPanel === "filter"}
        aria-label={translate("filter")}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={toggleFilterPanel}
        ref={filterToggleRef}
        style={{ anchorName: `${anchorPrefix}-filter` }}
        title={translate("filterRows")}
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
        {translate("copyAs")}
      </button>
      <button
        aria-label={translate("fit")}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={fitTableView}
        title={translate("fitColumns")}
        type="button"
      >
        <ControlIcon kind="fit" />
      </button>
      <button
        aria-label={translate("wrap")}
        aria-pressed={isWrapped}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={toggleWrap}
        title={translate("wrapColumns")}
        type="button"
      >
        <ControlIcon kind="wrap" />
      </button>
      {hiddenCount > 0 && (
        <button
          aria-label={translate("showHidden")}
          className={TABLE_CONTROLS_TOGGLE_CLASS}
          onClick={showHidden}
          title={translate("showHiddenRowsAndColumns")}
          type="button"
        >
          <ControlIcon kind="show" />
        </button>
      )}
      <button
        aria-label={translate("resetTableView")}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={resetTableView}
        title={translate("resetTableView")}
        type="button"
      >
        <ControlIcon kind="reset" />
      </button>
      <button
        aria-label={translate(isFocusMode ? "close" : "expand")}
        aria-pressed={isFocusMode}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={toggleFocusMode}
        ref={focusToggleRef}
        title={translate(isFocusMode ? "closeFocusMode" : "expandTableView")}
        type="button"
      >
        <ControlIcon kind="expand" />
      </button>

      {filterResult?.visibleRows === 0 && (
        <div aria-live="polite" className="github-table-enhancer-filter-empty-state" role="status">
          <span>
            {filterResult.matchingRows === 0
              ? translate("noRowsMatchFilter")
              : translate(
                  filterResult.matchingRows === 1 ? "matchingRowHidden" : "matchingRowsHidden",
                  [filterResult.matchingRows],
                )}
          </span>
          {filterResult.matchingRows > 0 && (
            <button onClick={showHidden} type="button">
              {translate("showHidden")}
            </button>
          )}
          <button
            onClick={() => controller.dispatch({ type: "filterQueryChanged", value: "" })}
            type="button"
          >
            {translate("clearFilter")}
          </button>
        </div>
      )}

      {openPanel === "copy" && (
        <CopyPanel
          firstButtonRef={copyFirstButtonRef}
          onCopy={copyTable}
          onEscape={closeCopyPanel}
          panelRef={panelRef}
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
          resultSummary={filterResultSummary}
          inputIdPrefix={inputIdPrefix}
          onEscape={closeFilterPanel}
          onFilterQueryChange={(value) =>
            controller.dispatch({ type: "filterQueryChanged", value })
          }
          onFilterUsesRegularExpressionChange={(value) =>
            controller.dispatch({ type: "filterRegularExpressionChanged", value })
          }
          panelRef={panelRef}
          positionAnchor={`${anchorPrefix}-filter`}
        />
      )}
      {openPanel === "freeze" && (
        <FreezePanel
          columnsInputRef={columnsInputRef}
          headingText={headingText}
          inputIdPrefix={inputIdPrefix}
          limits={controller.limits}
          onClose={closeFreezePanel}
          onSaveDefault={onSaveDefault ? saveDefault : undefined}
          onUpdateValues={updateValues}
          panelRef={panelRef}
          positionAnchor={`${anchorPrefix}-freeze`}
          rowsInputRef={rowsInputRef}
          saveDefaultButtonRef={saveDefaultButtonRef}
          saveDefaultStatus={saveDefaultStatus}
          values={freeze}
        />
      )}
    </>
  );
}

export function createTableControls(props: TableControlsProps): HTMLElement {
  const controls = document.createElement(TABLE_CONTROLS_TAG);
  controls.classList.add(TABLE_CONTROLS_CLASS);
  render(<TableControls {...props} />, controls);

  return controls;
}

export function destroyTableControls(controls: HTMLElement): void {
  render(null, controls);
}
