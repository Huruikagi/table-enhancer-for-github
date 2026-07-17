import type { Ref, RefObject, VNode } from "preact";
import { translate } from "../../i18n";
import { TABLE_CONTROLS_PANEL_CLASS } from "../constants";
import type { CopyFormat } from "../features/copy";
import type { FreezeOptions } from "../state";

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
  onValidValueChange?: () => void;
  values: FreezeOptions;
};

type FilterPanelProps = {
  filterInputRef: Ref<HTMLInputElement>;
  filterQuery: string;
  filterRegularExpressionError: string | null;
  filterUsesRegularExpression: boolean;
  resultSummary: string | null;
  inputIdPrefix: string;
  onFilterQueryChange: (filterQuery: string) => void;
  onFilterUsesRegularExpressionChange: (value: boolean) => void;
  onEscape: () => void;
  panelRef: Ref<HTMLDivElement>;
  positionAnchor: string;
};

type CopyPanelProps = {
  firstButtonRef: Ref<HTMLButtonElement>;
  onCopy: (format: CopyFormat) => void;
  onEscape: () => void;
  panelRef: Ref<HTMLDivElement>;
  positionAnchor: string;
  status: CopyFormat | "failed" | "idle";
};

type FreezePanelProps = {
  headingText?: string | null;
  inputIdPrefix: string;
  limits: FreezeOptions;
  onClose: () => void;
  onSaveDefault?: () => void;
  onUpdateValues: (values: FreezeOptions) => FreezeOptions;
  panelRef: Ref<HTMLDivElement>;
  positionAnchor: string;
  columnsInputRef: RefObject<HTMLInputElement>;
  rowsInputRef: Ref<HTMLInputElement>;
  saveDefaultButtonRef: RefObject<HTMLButtonElement>;
  saveDefaultStatus: SaveDefaultStatus;
  values: FreezeOptions;
};

const COPY_FORMAT_LABELS = {
  markdown: "Markdown",
  csv: "CSV",
  tsv: "TSV",
} satisfies Record<CopyFormat, string>;

function FreezeNumberInput({
  inputIdPrefix,
  inputRef,
  kind,
  label,
  limits,
  onChange,
  onEscape,
  onValidValueChange,
  values,
}: FreezeNumberInputProps): VNode {
  return (
    <input
      aria-label={label}
      id={`${inputIdPrefix}-${kind}`}
      inputMode="numeric"
      maxLength={1}
      max={String(limits[kind])}
      min="0"
      onFocus={(event) => {
        event.currentTarget.select();
      }}
      onInput={(event) => {
        const input = event.currentTarget;
        const nextValue = Number(input.value);
        const isValidValue =
          /^[0-9]$/.test(input.value) &&
          Number.isInteger(nextValue) &&
          nextValue >= 0 &&
          nextValue <= limits[kind];

        if (!isValidValue) {
          input.value = String(values[kind]);
          return;
        }

        const clampedValues = onChange({ ...values, [kind]: Number(input.value) });
        input.value = String(clampedValues[kind]);

        onValidValueChange?.();
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
      pattern="[0-9]"
      type="text"
      value={String(values[kind])}
    />
  );
}

export function FilterPanel({
  filterInputRef,
  filterQuery,
  filterRegularExpressionError,
  filterUsesRegularExpression,
  resultSummary,
  inputIdPrefix,
  onFilterQueryChange,
  onFilterUsesRegularExpressionChange,
  onEscape,
  panelRef,
  positionAnchor,
}: FilterPanelProps): VNode {
  return (
    <div className={TABLE_CONTROLS_PANEL_CLASS} ref={panelRef} style={{ positionAnchor }}>
      <label htmlFor={`${inputIdPrefix}-filter`}>
        {translate("filterRows")}
        <input
          aria-describedby={
            filterRegularExpressionError
              ? `${inputIdPrefix}-filter-error`
              : resultSummary
                ? `${inputIdPrefix}-filter-summary`
                : undefined
          }
          aria-invalid={filterRegularExpressionError ? "true" : undefined}
          aria-label={translate("filterRows")}
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
          placeholder={translate("filterRowsPlaceholder")}
          ref={filterInputRef}
          type="search"
          value={filterQuery}
        />
      </label>
      <button
        aria-label={translate("useRegularExpression")}
        aria-pressed={filterUsesRegularExpression}
        onClick={() => onFilterUsesRegularExpressionChange(!filterUsesRegularExpression)}
        title={translate("useRegularExpression")}
        type="button"
      >
        .*
      </button>
      {filterRegularExpressionError && (
        <span id={`${inputIdPrefix}-filter-error`} role="alert">
          {filterRegularExpressionError}
        </span>
      )}
      {resultSummary && (
        <span
          className="github-table-enhancer-filter-summary"
          id={`${inputIdPrefix}-filter-summary`}
        >
          {resultSummary}
        </span>
      )}
      {filterQuery.trim() && (
        <button onClick={() => onFilterQueryChange("")} type="button">
          {translate("clearFilter")}
        </button>
      )}
    </div>
  );
}

export function CopyPanel({
  firstButtonRef,
  onCopy,
  onEscape,
  panelRef,
  positionAnchor,
  status,
}: CopyPanelProps): VNode {
  return (
    <div
      aria-live="polite"
      className={TABLE_CONTROLS_PANEL_CLASS}
      ref={panelRef}
      style={{ positionAnchor }}
    >
      {(["markdown", "csv", "tsv"] as const).map((format) => (
        <button
          key={format}
          onClick={() => onCopy(format)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onEscape();
            }
          }}
          ref={format === "markdown" ? firstButtonRef : undefined}
          type="button"
        >
          {status === format
            ? translate("copiedFormat", [COPY_FORMAT_LABELS[format]])
            : COPY_FORMAT_LABELS[format]}
        </button>
      ))}
      {status === "failed" && <span>{translate("copyFailed")}</span>}
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
  panelRef,
  positionAnchor,
  columnsInputRef,
  rowsInputRef,
  saveDefaultButtonRef,
  saveDefaultStatus,
  values,
}: FreezePanelProps): VNode {
  return (
    <div
      className={`${TABLE_CONTROLS_PANEL_CLASS} ${TABLE_CONTROLS_PANEL_CLASS}--freeze`}
      ref={panelRef}
      style={{ positionAnchor }}
    >
      <label htmlFor={`${inputIdPrefix}-rows`}>
        {translate("rows")}
        <FreezeNumberInput
          inputIdPrefix={inputIdPrefix}
          inputRef={rowsInputRef}
          kind="rows"
          label={translate("frozenRows")}
          limits={limits}
          onChange={onUpdateValues}
          onEscape={onClose}
          onValidValueChange={() => columnsInputRef.current?.focus()}
          values={values}
        />
      </label>
      <label htmlFor={`${inputIdPrefix}-columns`}>
        {translate("columns")}
        <FreezeNumberInput
          inputIdPrefix={inputIdPrefix}
          inputRef={columnsInputRef}
          kind="columns"
          label={translate("frozenColumns")}
          limits={limits}
          onChange={onUpdateValues}
          onEscape={onClose}
          onValidValueChange={() => saveDefaultButtonRef.current?.focus()}
          values={values}
        />
      </label>
      <button onClick={() => onUpdateValues({ rows: 0, columns: 0 })} type="button">
        {translate("reset")}
      </button>
      {headingText && onSaveDefault && (
        <button
          aria-live="polite"
          disabled={saveDefaultStatus === "saving"}
          onClick={onSaveDefault}
          ref={saveDefaultButtonRef}
          type="button"
        >
          {saveDefaultStatus === "saving" && translate("saving")}
          {saveDefaultStatus === "saved" && translate("saved")}
          {saveDefaultStatus === "failed" && translate("failed")}
          {saveDefaultStatus === "idle" && translate("saveDefault")}
        </button>
      )}
    </div>
  );
}
