import type { VNode } from "preact";
import { render } from "preact";
import { useId, useLayoutEffect, useRef, useState } from "preact/hooks";
import {
  HIDE_ACTION_DATA_ATTRIBUTE,
  HIDE_INDEX_DATA_ATTRIBUTE,
  TABLE_CONTROLS_CLASS,
  TABLE_CONTROLS_PANEL_CLASS,
  TABLE_CONTROLS_TAG,
  TABLE_CONTROLS_TOGGLE_CLASS,
  TABLE_HIDE_BUTTON_CLASS,
} from "./table-constants";
import type { FreezeOptions } from "./table-freeze";
import {
  installColumnResizeBehavior,
  installTableColumnResizeControls,
  resetTableColumnResizeControls,
} from "./table-resize";
import { addUniqueSortedIndex, clampInteger } from "./table-utils";
import { applyTableVisibility } from "./table-visibility";

type FreezeInputKind = keyof FreezeOptions;
type HideAction = "hide-row" | "hide-column";
type SaveDefaultStatus = "idle" | "saving" | "saved" | "failed";

type TableControlsProps = {
  defaultValuesPromise?: Promise<FreezeOptions | null> | null;
  headingText?: string | null;
  table: HTMLTableElement;
  limits: FreezeOptions;
  onChange: (values: FreezeOptions) => void;
  onSaveDefault?: (values: FreezeOptions) => Promise<void>;
};

function createHideButton(action: HideAction, index: number): HTMLButtonElement {
  const button = document.createElement("button");
  const labelKind = action === "hide-row" ? "row" : "column";

  button.ariaLabel = `Hide ${labelKind} ${index + 1}`;
  button.className = `${TABLE_HIDE_BUTTON_CLASS} ${TABLE_HIDE_BUTTON_CLASS}--${labelKind}`;
  button.dataset[HIDE_ACTION_DATA_ATTRIBUTE] = action;
  button.dataset[HIDE_INDEX_DATA_ATTRIBUTE] = String(index);
  button.title = button.ariaLabel;
  button.type = "button";
  button.textContent = "×";

  return button;
}

function resetTableHideControls(table: HTMLTableElement): void {
  for (const button of table.querySelectorAll(`.${TABLE_HIDE_BUTTON_CLASS}`)) {
    button.remove();
  }
}

function installTableHideControls(table: HTMLTableElement): void {
  resetTableHideControls(table);

  for (const [rowIndex, row] of Array.from(table.rows).entries()) {
    const firstCell = row.cells[0];

    if (firstCell) {
      firstCell.appendChild(createHideButton("hide-row", rowIndex));
    }
  }

  const columnControlRow = table.tHead?.rows[0] ?? table.rows[0];

  if (!columnControlRow) {
    return;
  }

  for (const [columnIndex, cell] of Array.from(columnControlRow.cells).entries()) {
    cell.appendChild(createHideButton("hide-column", columnIndex));
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
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<FreezeOptions>({ rows: 0, columns: 0 });
  const [hiddenRows, setHiddenRows] = useState<readonly number[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<readonly number[]>([]);
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
      if (!(event.target instanceof Element)) {
        return;
      }

      const button = event.target.closest<HTMLButtonElement>(`.${TABLE_HIDE_BUTTON_CLASS}`);

      if (!button || !table.contains(button)) {
        return;
      }

      const action = button.dataset[HIDE_ACTION_DATA_ATTRIBUTE];
      const index = Number(button.dataset[HIDE_INDEX_DATA_ATTRIBUTE]);

      if (!Number.isInteger(index)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (action === "hide-row") {
        setHiddenRows((currentValue) => addUniqueSortedIndex(currentValue, index));
      }

      if (action === "hide-column") {
        setHiddenColumns((currentValue) => addUniqueSortedIndex(currentValue, index));
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
    applyTableVisibility(table, { rows: hiddenRows, columns: hiddenColumns });
    onChange(values);
  }, [hiddenRows, hiddenColumns, onChange, table, values]);

  useLayoutEffect(
    () => installColumnResizeBehavior(table, () => onChange(values)),
    [onChange, table, values],
  );

  const createNumberInput = (kind: FreezeInputKind, label: string) => (
    <input
      aria-label={label}
      id={`${inputIdPrefix}-${kind}`}
      inputMode="numeric"
      max={String(limits[kind])}
      min="0"
      onChange={(event) => {
        const input = event.currentTarget;
        const clampedValues = updateValues({ ...values, [kind]: Number(input.value) });
        input.value = String(clampedValues[kind]);
      }}
      type="number"
      value={String(values[kind])}
    />
  );

  return (
    <>
      <button
        aria-expanded={isOpen}
        className={TABLE_CONTROLS_TOGGLE_CLASS}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        Freeze
      </button>
      {hiddenCount > 0 && (
        <button className={TABLE_CONTROLS_TOGGLE_CLASS} onClick={showHidden} type="button">
          Show hidden
        </button>
      )}
      {isOpen && (
        <div className={TABLE_CONTROLS_PANEL_CLASS}>
          <label htmlFor={`${inputIdPrefix}-rows`}>
            Rows
            {createNumberInput("rows", "Frozen rows")}
          </label>
          <label htmlFor={`${inputIdPrefix}-columns`}>
            Columns
            {createNumberInput("columns", "Frozen columns")}
          </label>
          <button onClick={() => updateValues({ rows: 0, columns: 0 })} type="button">
            Reset
          </button>
          {headingText && onSaveDefault && (
            <button
              aria-live="polite"
              disabled={saveDefaultStatus === "saving"}
              onClick={saveDefault}
              type="button"
            >
              {saveDefaultStatus === "saving" && "Saving..."}
              {saveDefaultStatus === "saved" && "Saved"}
              {saveDefaultStatus === "failed" && "Failed"}
              {saveDefaultStatus === "idle" && "Save default"}
            </button>
          )}
        </div>
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
