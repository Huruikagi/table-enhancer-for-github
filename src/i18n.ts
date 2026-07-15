export const englishMessages = {
  clearFilter: "Clear filter",
  close: "Close",
  closeFocusMode: "Close Focus mode (Esc)",
  columns: "Columns",
  copiedFormat: "Copied $1",
  copyAs: "Copy as",
  copyFailed: "Copy failed",
  expand: "Expand",
  expandTableView: "Expand table view",
  failed: "Failed",
  filter: "Filter",
  filterRows: "Filter rows",
  filterRowsPlaceholder: "Filter rows...",
  filterSummaryAllVisible: "$1 of $2 rows",
  filterSummarySomeVisible: "$1 shown · $2 matches · $3 total",
  fit: "Fit",
  fitColumns: "Fit columns",
  focusMode: "Focus mode",
  focusModeInstructionAfter: "to return",
  focusModeInstructionBefore: "Press",
  freeze: "Freeze",
  frozenColumns: "Frozen columns",
  frozenRows: "Frozen rows",
  hideColumn: "Hide column $1",
  hideRow: "Hide row $1",
  invalidRegularExpression: "Invalid regular expression",
  matchingRowHidden: "$1 matching row is hidden.",
  matchingRowsHidden: "$1 matching rows are hidden.",
  noRowsMatchFilter: "No rows match this filter.",
  reset: "Reset",
  resetTableView: "Reset table view",
  resizeColumn: "Resize column $1",
  rows: "Rows",
  saveDefault: "Save default",
  saved: "Saved",
  saving: "Saving...",
  showHidden: "Show hidden",
  showHiddenRowsAndColumns: "Show hidden rows and columns",
  sortByColumn: "Sort by column $1",
  sortByColumnHint: "$1 (ascending, descending, original order)",
  useRegularExpression: "Use regular expression",
  wrap: "Wrap",
  wrapColumns: "Wrap columns",
} as const;

export type MessageKey = keyof typeof englishMessages;

function applySubstitutions(message: string, substitutions: readonly string[]): string {
  return substitutions.reduce(
    (result, substitution, index) => result.split(`$${index + 1}`).join(substitution),
    message,
  );
}

export function translate(
  key: MessageKey,
  substitutions: readonly (number | string)[] = [],
): string {
  const normalizedSubstitutions = substitutions.map(String);
  const i18n = typeof chrome === "undefined" ? undefined : chrome.i18n;
  let localized: string | undefined;

  try {
    localized = normalizedSubstitutions.length
      ? i18n?.getMessage(key, normalizedSubstitutions)
      : i18n?.getMessage(key);
  } catch {
    localized = undefined;
  }

  return localized || applySubstitutions(englishMessages[key], normalizedSubstitutions);
}
