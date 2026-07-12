# Architecture

GitHub Table Enhancer runs as one content script, but each enhanced table is managed as an
independent session. The architecture keeps GitHub's original table DOM in place and projects a
single table view state onto it.

## Runtime flow

```text
content.ts
  -> enhancer.ts discovers GitHub Markdown tables
  -> lifecycle.ts mounts one TableSession per table
  -> controls.tsx dispatches user actions
  -> state.ts reduces actions into TableViewState
  -> reconcile.ts projects state onto the table DOM
```

`TableSession` is the application boundary for one table. It owns the persistent view state,
installs table-level interactions, exposes clipboard and saved-default operations to the controls,
and releases those resources when GitHub removes the table from the page.

## State ownership

`TableViewState` is the source of truth for changes that affect the displayed table:

- frozen row and column counts
- manually hidden rows and columns
- filter query and regular expression mode
- sort order
- wrapping
- fitted or manually resized column widths

Short-lived toolbar presentation state, such as the open popup, Focus mode, and success messages,
stays inside the Preact controls. Controls dispatch `TableViewAction` values instead of directly
mutating table layout.

## DOM reconciliation

`reconcileTable` is the only cross-feature DOM orchestrator. It applies changed projections in a
fixed order:

1. sort rows
2. apply hidden rows, hidden columns, and filtering
3. apply wrapping and column widths
4. recalculate frozen row and column layout

Feature modules should mutate only their own projection. If one feature changes layout needed by
another feature, `reconcileTable` coordinates the follow-up rather than one feature calling the
other's mutation function.

## Lifecycle

`lifecycle.ts` stores sessions in a `WeakMap<HTMLTableElement, TableSession>`. The page-level
`MutationObserver` mounts newly added tables and destroys sessions for detached tables. Destroying
a session unmounts Preact, removes document and pointer listeners, resets injected table controls,
and clears Focus mode page state.

## External operations

Clipboard writes and saved Freeze defaults are exposed through the session boundary. The default
adapters use `navigator.clipboard` and `chrome.storage.local`; tests can supply replacements without
changing controls or state transitions.

## Testing boundaries

- `state.test.ts` covers pure state transitions.
- `lifecycle.test.ts` covers mount and destroy cleanup.
- `table-enhancer.test.ts` remains the DOM integration and behavior regression suite.
- `e2e/table-enhancer.spec.ts` verifies the built extension in Chromium.

New behavior should normally begin with a state transition test, add DOM integration coverage when
it changes a projection, and add E2E coverage when it changes a browser-visible workflow.
