# Architecture

GitHub Table Enhancer runs as one content script, but each enhanced table has an independent pure
controller and browser runtime. The architecture keeps GitHub's original table DOM in place and
projects a single table view state onto it.

## Runtime flow

```text
content.ts
  -> enhancer.ts discovers GitHub Markdown tables
  -> lifecycle.ts owns one browser runtime per table
  -> mount.ts wires DOM events, controls, and external adapters
  -> controls.tsx dispatches actions to TableController
  -> controller.ts and state.ts produce TableViewState
  -> mount.ts invokes reconcile.ts to project state onto the DOM
```

`TableController` is independent of Preact, browser APIs, and table DOM. `mount.ts` is the
composition boundary: it installs table interactions, subscribes DOM reconciliation to controller
changes, passes external operation callbacks to the controls, and releases those resources when
GitHub removes the table from the page.

## Module layout

The files directly under `src/table/` define application boundaries such as state, controller,
mounting, reconciliation, lifecycle, discovery, storage, and controls. Individual table behaviors
live under `src/table/features/`:

- `copy.ts`
- `focus-mode.ts`
- `freeze.ts`
- `hide-controls.ts`
- `resize.ts`
- `sort.ts`
- `visibility.ts`

Feature modules may use shared state types, constants, and read-only helpers from another feature.
Cross-feature DOM mutation order remains the responsibility of `reconcile.ts`.

## State ownership

`TableViewState` is the source of truth for changes that affect the displayed table:

- frozen row and column counts
- manually hidden rows and columns
- filter query and regular expression mode
- sort order
- wrapping
- fitted or manually resized column widths

Short-lived toolbar presentation state, such as the open popup, Focus mode, and success messages,
stays inside the Preact controls. Controls depend on `TableController` for persistent state and
receive browser operations as callbacks; they do not directly mutate table layout.

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

`lifecycle.ts` stores browser runtimes in a `WeakMap<HTMLTableElement, TableRuntime>`. The page-level
`MutationObserver` mounts newly added tables and destroys runtimes for detached tables. Destroying
a runtime unmounts Preact, removes document and pointer listeners, resets injected table controls,
and clears Focus mode page state. A previously destroyed table can be mounted again without
duplicating injected controls.

## External operations

Clipboard writes and saved Freeze defaults are injected at the mount boundary. The default
adapters use `navigator.clipboard` and `chrome.storage.local`; tests can supply replacements without
changing controls or state transitions.

## Testing boundaries

- `state.test.ts` covers pure state transitions.
- `controller.test.ts` covers controller policies and notifications without a DOM.
- `enhancer-discovery.test.ts` covers GitHub URL and Markdown discovery rules.
- `features/projections.test.ts` covers focused DOM projections.
- `lifecycle.test.ts` covers mount, destroy, cleanup, and remount.
- `table-enhancer.test.ts` remains the DOM integration and behavior regression suite.
- `e2e/table-enhancer.spec.ts` verifies the built extension in Chromium.

New behavior should normally begin with a state transition test, add DOM integration coverage when
it changes a projection, and add E2E coverage when it changes a browser-visible workflow.
