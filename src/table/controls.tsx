import type { VNode } from "preact";
import { render } from "preact";
import { useId, useLayoutEffect, useRef, useState } from "preact/hooks";
import { TABLE_CONTROLS_CLASS, TABLE_CONTROLS_TAG, TABLE_CONTROLS_TOGGLE_CLASS } from "./constants";
import { ControlIcon } from "./control-icons";
import { CopyPanel, FilterPanel, FreezePanel, type SaveDefaultStatus } from "./control-panels";
import type { CopyFormat } from "./copy";
import { useTableFocusMode } from "./focus-mode";
import type { FreezeOptions } from "./freeze";
import type { TableSession } from "./session";
import { getFilterRegularExpressionError } from "./visibility";

type TableControlsProps = {
  session: TableSession;
};

type OpenPanel = "copy" | "filter" | "freeze" | null;

function TableControls({ session }: TableControlsProps): VNode {
  const inputIdPrefix = useId();
  const copyToggleRef = useRef<HTMLButtonElement>(null);
  const copyFirstButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const freezeToggleRef = useRef<HTMLButtonElement>(null);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const focusToggleRef = useRef<HTMLButtonElement>(null);
  const rowsInputRef = useRef<HTMLInputElement>(null);
  const columnsInputRef = useRef<HTMLInputElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [viewState, setViewState] = useState(session.getState());
  const [copyStatus, setCopyStatus] = useState<CopyFormat | "failed" | "idle">("idle");
  const [saveDefaultStatus, setSaveDefaultStatus] = useState<SaveDefaultStatus>("idle");
  const { filterQuery, filterUsesRegularExpression, freeze, hiddenColumns, hiddenRows, isWrapped } =
    viewState;
  const hiddenCount = hiddenRows.length + hiddenColumns.length;
  const anchorPrefix = `--gte-${inputIdPrefix.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const applyValues = (nextValues: FreezeOptions): FreezeOptions => {
    session.dispatch({ type: "freezeChanged", value: nextValues });
    return session.getState().freeze;
  };

  const updateValues = (nextValues: FreezeOptions): FreezeOptions => {
    setSaveDefaultStatus("idle");

    return applyValues(nextValues);
  };

  const showHidden = (): void => {
    session.dispatch({ type: "hiddenShown" });
  };

  const fitTableView = (): void => {
    session.fitColumns();
  };

  const resetTableView = (): void => {
    setSaveDefaultStatus("idle");
    session.dispatch({ type: "reset" });
  };

  const toggleWrap = (): void => {
    session.dispatch({ type: "wrapChanged", value: !isWrapped });
  };

  const copyTable = async (format: CopyFormat): Promise<void> => {
    try {
      await session.copy(format);
      setCopyStatus(format);
      window.setTimeout(() => {
        setCopyStatus((currentStatus) => (currentStatus === format ? "idle" : currentStatus));
      }, 1500);
    } catch {
      setCopyStatus("failed");
    }
  };

  const saveDefault = async (): Promise<void> => {
    if (!session.saveDefault) {
      return;
    }

    setSaveDefaultStatus("saving");

    try {
      await session.saveDefault();
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

  useLayoutEffect(() => session.subscribe(setViewState), [session]);

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

  useTableFocusMode(session.table, isFocusMode, setIsFocusMode, focusToggleRef);

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
          inputIdPrefix={inputIdPrefix}
          onEscape={closeFilterPanel}
          onFilterQueryChange={(value) => session.dispatch({ type: "filterQueryChanged", value })}
          onFilterUsesRegularExpressionChange={(value) =>
            session.dispatch({ type: "filterRegularExpressionChanged", value })
          }
          panelRef={panelRef}
          positionAnchor={`${anchorPrefix}-filter`}
        />
      )}
      {openPanel === "freeze" && (
        <FreezePanel
          columnsInputRef={columnsInputRef}
          headingText={session.headingText}
          inputIdPrefix={inputIdPrefix}
          limits={session.limits}
          onClose={closeFreezePanel}
          onSaveDefault={session.saveDefault ? saveDefault : undefined}
          onUpdateValues={updateValues}
          panelRef={panelRef}
          positionAnchor={`${anchorPrefix}-freeze`}
          rowsInputRef={rowsInputRef}
          saveDefaultStatus={saveDefaultStatus}
          values={freeze}
        />
      )}
    </>
  );
}

export function createTableControls(session: TableSession): HTMLElement {
  const controls = document.createElement(TABLE_CONTROLS_TAG);
  controls.classList.add(TABLE_CONTROLS_CLASS);
  render(<TableControls session={session} />, controls);

  return controls;
}

export function destroyTableControls(controls: HTMLElement): void {
  render(null, controls);
}
