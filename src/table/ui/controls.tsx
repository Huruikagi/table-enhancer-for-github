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
import { useControlPanels } from "./use-control-panels";
import { useTransientStatus } from "./use-transient-status";

type TableControlsProps = {
  controller: TableController;
  headingText?: string | null;
  onCopy: (format: CopyFormat) => Promise<void>;
  onFitColumns: () => void;
  onSaveDefault?: () => Promise<void>;
  table: HTMLTableElement;
};

function TableControls({
  controller,
  headingText,
  onCopy,
  onFitColumns,
  onSaveDefault,
  table,
}: TableControlsProps): VNode {
  const inputIdPrefix = useId();
  const {
    openPanel,
    panelRef,
    copyToggleRef,
    filterToggleRef,
    freezeToggleRef,
    copyFirstButtonRef,
    filterInputRef,
    rowsInputRef,
    togglePanel,
    closePanel,
  } = useControlPanels();
  const focusToggleRef = useRef<HTMLButtonElement>(null);
  const columnsInputRef = useRef<HTMLInputElement>(null);
  const saveDefaultButtonRef = useRef<HTMLButtonElement>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [viewState, setViewState] = useState(controller.getState());
  const [copyStatus, setCopyStatus] = useTransientStatus<CopyFormat | "failed" | "idle">("idle");
  const [saveDefaultStatus, setSaveDefaultStatus] = useTransientStatus<SaveDefaultStatus>("idle");
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
      setCopyStatus(format, 1500);
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
      setSaveDefaultStatus("saved", 1500);
    } catch {
      setSaveDefaultStatus("failed");
    }
  };

  useLayoutEffect(() => controller.subscribe((state) => setViewState(state)), [controller]);

  useTableFocusMode(table, isFocusMode, setIsFocusMode, focusToggleRef);

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
        aria-label={translate("freeze")}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={() => togglePanel("freeze")}
        ref={freezeToggleRef}
        style={{ anchorName: `${anchorPrefix}-freeze` }}
        title={translate("freeze")}
        type="button"
      >
        <ControlIcon kind="freeze" />
      </button>
      <button
        aria-expanded={openPanel === "filter"}
        aria-label={translate("filter")}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={() => togglePanel("filter")}
        ref={filterToggleRef}
        style={{ anchorName: `${anchorPrefix}-filter` }}
        title={translate("filterRows")}
        type="button"
      >
        <ControlIcon kind="filter" />
      </button>
      <button
        aria-expanded={openPanel === "copy"}
        aria-label={translate("copyAs")}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={() => togglePanel("copy")}
        ref={copyToggleRef}
        style={{ anchorName: `${anchorPrefix}-copy` }}
        title={translate("copyAs")}
        type="button"
      >
        <ControlIcon kind="copy" />
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
          onEscape={closePanel}
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
          onEscape={closePanel}
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
          onClose={closePanel}
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
