import type { Ref, VNode } from "preact";
import { TABLE_CONTROLS_PANEL_CLASS } from "./constants";
import type { FreezeOptions } from "./freeze";

type FreezeInputKind = keyof FreezeOptions;

export type SaveDefaultStatus = "idle" | "saving" | "saved" | "failed";

type FreezeNumberInputProps = {
  inputIdPrefix: string;
  inputRef?: Ref<HTMLInputElement>;
  kind: FreezeInputKind;
  label: string;
  limits: FreezeOptions;
  onChange: (values: FreezeOptions) => FreezeOptions;
  onEscape: () => void;
  values: FreezeOptions;
};

type FilterPanelProps = {
  filterInputRef: Ref<HTMLInputElement>;
  filterQuery: string;
  inputIdPrefix: string;
  onFilterQueryChange: (filterQuery: string) => void;
  onEscape: () => void;
};

type FreezePanelProps = {
  headingText?: string | null;
  inputIdPrefix: string;
  limits: FreezeOptions;
  onClose: () => void;
  onSaveDefault?: () => void;
  onUpdateValues: (values: FreezeOptions) => FreezeOptions;
  rowsInputRef: Ref<HTMLInputElement>;
  saveDefaultStatus: SaveDefaultStatus;
  values: FreezeOptions;
};

function FreezeNumberInput({
  inputIdPrefix,
  inputRef,
  kind,
  label,
  limits,
  onChange,
  onEscape,
  values,
}: FreezeNumberInputProps): VNode {
  return (
    <input
      aria-label={label}
      id={`${inputIdPrefix}-${kind}`}
      inputMode="numeric"
      max={String(limits[kind])}
      min="0"
      onChange={(event) => {
        const input = event.currentTarget;
        const clampedValues = onChange({ ...values, [kind]: Number(input.value) });
        input.value = String(clampedValues[kind]);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        onEscape();
      }}
      ref={inputRef}
      type="number"
      value={String(values[kind])}
    />
  );
}

export function FilterPanel({
  filterInputRef,
  filterQuery,
  inputIdPrefix,
  onFilterQueryChange,
  onEscape,
}: FilterPanelProps): VNode {
  return (
    <div className={TABLE_CONTROLS_PANEL_CLASS}>
      <label htmlFor={`${inputIdPrefix}-filter`}>
        Filter rows
        <input
          aria-label="Filter rows"
          id={`${inputIdPrefix}-filter`}
          onInput={(event) => onFilterQueryChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape") {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            onEscape();
          }}
          placeholder="Filter rows..."
          ref={filterInputRef}
          type="search"
          value={filterQuery}
        />
      </label>
      {filterQuery.trim() && (
        <button onClick={() => onFilterQueryChange("")} type="button">
          Clear filter
        </button>
      )}
    </div>
  );
}

export function FreezePanel({
  headingText,
  inputIdPrefix,
  limits,
  onClose,
  onSaveDefault,
  onUpdateValues,
  rowsInputRef,
  saveDefaultStatus,
  values,
}: FreezePanelProps): VNode {
  return (
    <div className={TABLE_CONTROLS_PANEL_CLASS}>
      <label htmlFor={`${inputIdPrefix}-rows`}>
        Rows
        <FreezeNumberInput
          inputIdPrefix={inputIdPrefix}
          inputRef={rowsInputRef}
          kind="rows"
          label="Frozen rows"
          limits={limits}
          onChange={onUpdateValues}
          onEscape={onClose}
          values={values}
        />
      </label>
      <label htmlFor={`${inputIdPrefix}-columns`}>
        Columns
        <FreezeNumberInput
          inputIdPrefix={inputIdPrefix}
          kind="columns"
          label="Frozen columns"
          limits={limits}
          onChange={onUpdateValues}
          onEscape={onClose}
          values={values}
        />
      </label>
      <button onClick={() => onUpdateValues({ rows: 0, columns: 0 })} type="button">
        Reset
      </button>
      {headingText && onSaveDefault && (
        <button
          aria-live="polite"
          disabled={saveDefaultStatus === "saving"}
          onClick={onSaveDefault}
          type="button"
        >
          {saveDefaultStatus === "saving" && "Saving..."}
          {saveDefaultStatus === "saved" && "Saved"}
          {saveDefaultStatus === "failed" && "Failed"}
          {saveDefaultStatus === "idle" && "Save default"}
        </button>
      )}
    </div>
  );
}
