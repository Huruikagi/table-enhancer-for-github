# Architecture

GitHub Table Enhancer keeps its UI in an isolated content script; a small MAIN-world script
reads already-loaded GitHub metadata. Each enhanced table has an independent pure
controller and browser runtime. The architecture keeps GitHub's original table DOM in place and
projects a single table view state onto it. Confirmed YAML frontmatter uses a
separate property view, described below, rather than a table controller.

## Frontmatter

`src/frontmatter/source.ts` validates GitHub's internal source payload.
It checks the repository, path, ref and commit consistency, reads source Markdown
from `codeViewBlobLayoutRoute.StyledBlob.rawLines`, and parses its leading YAML
mapping. Unsupported payloads, invalid YAML, aliases, complex keys, and metadata
beyond the parsing limits fall back to native rendering. No network API is used.

Legacy pages provide this payload through `react-app.embeddedData`. UI Service
pages remove their hydration scripts, so `page-data.ts` runs a separate,
read-only MAIN-world adapter. `frontmatter/cache-bridge.ts` uses the existing
`window.__TANSTACK_QUERY_CLIENT__` and its query cache's `findAll`/`subscribe`
methods. It never invokes fetch, prefetch, invalidation, or cache writes.
`cache-source.ts` recognizes only the four code-view queries for the current
repository/file and rejects incomplete, fetching, invalidated or ambiguous
entries. It publishes a bounded JSON projection containing repository/path/ref
identity, the leading YAML block, and the first table from the cached preview.
No account data, other files, or document body is copied. The isolated content
script revalidates this untrusted projection just like embedded JSON. The MAIN
script has no extension API access and no additional permissions are required.

The bridge subscribes to relevant cache updates, detects pathname changes, and
briefly retries late hydration (up to 30 seconds), without permanent polling.
Missing or changed GitHub APIs remove the projection and preserve native markup.
These are private GitHub schemas, so new layouts may need an adapter update;
table shape alone never authorizes rendering metadata.

`runtime.ts` matches that source to the current URL and the first rendered table,
including the table HTML supplied by `codeViewBlobRoute.richText` and its keys.
Only a confirmed match can hide the original element and insert the property
view. The original DOM is retained and restored when the match is lost or the
article is removed. Embedded data is cached per script/content; mutations to the
article or JSON trigger reconciliation, including late data and navigation.
The cache projection uses a separate `data-gte-metadata-source` script marker
and follows the same mutation routing as legacy embedded JSON.

`view.ts` renders values using text nodes, definition lists and native details
elements. Top-level properties are open, nested collections are collapsed, and
short scalar lists use tags. This view has no table controller, storage, or
network operations. The table discovery boundary excludes metadata and nested
tables. A conservative leading key/value shape check can exclude a table from
controls, but can never authorize replacing it with a property view.

`frontmatter.test.ts` covers parsing, binding, fallback and lifecycle;
`cache-source.test.ts` covers cache projection, source validation, passive
subscription, late hydration, navigation, and unavailable APIs;
`e2e/frontmatter.spec.ts` covers the loaded extension, flat/nested metadata,
keyboard interaction, themes, navigation and the absence of extra requests.
It exercises both embedded JSON and a page-world-only query cache with no
serialized data in the DOM, verifying the actual MAIN/isolated-world boundary.

## Runtime flow

Both content scripts and their scoped styles load on `https://github.com/*` so same-document
navigation from a repository listing or another GitHub page can activate the extension. Table
discovery and cache reads remain restricted to Markdown blob paths. `page-navigation.ts` observes
committed Navigation API entries plus `popstate`/`pageshow` in each script world, without patching
GitHub's history methods. Page mutations remain a fallback for pathname changes. Navigation
rescans existing tables as well as new nodes, including when rendering preceded the URL change.
Disconnecting the page runtime releases both mutation observation and navigation listeners.
The metadata bridge restarts its bounded hydration retries after navigation and unsubscribes
from the cache outside Markdown previews.

```text
content.ts
  -> page-runtime.ts routes page mutations to frontmatter and table runtimes
  -> table/discovery.ts discovers GitHub Markdown tables
  -> lifecycle.ts owns one browser runtime per table
  -> mount.ts wires DOM events, controls, and external adapters
  -> ui/controls.tsx dispatches actions to TableController
  -> controller.ts and state.ts produce TableViewState
  -> mount.ts invokes reconcile.ts to project state onto the DOM
```

`page-runtime.ts` reconciles only articles affected by a mutation. Embedded JSON changes
invalidate articles within the same `react-app` (or the document when unscoped), and a pathname
change invalidates all articles. Detached articles are restored before any new metadata view is
mounted. Unrelated page mutations do not trigger metadata reconciliation. `table/enhancer.ts`
preserves the existing exports as a compatibility facade without owning page observation.

`TableController` is independent of Preact, browser APIs, and table DOM. `mount.ts` is the
composition boundary: it installs table interactions, subscribes DOM reconciliation to controller
changes, passes external operation callbacks to the controls, and releases those resources when
GitHub removes the table from the page.

## Module layout

The files directly under `src/table/` define application boundaries such as state, controller,
mounting, reconciliation, lifecycle, discovery, and storage. Individual table behaviors live under
`src/table/features/`:

- `copy.ts`
- `focus-mode.ts`
- `freeze.ts`
- `hide-controls.ts`
- `hover.ts`
- `row-selection.ts`
- `resize.ts`
- `sort.ts`
- `visibility.ts`

Feature modules may use shared state types, constants, and read-only helpers from another feature.
Cross-feature DOM mutation order remains the responsibility of `reconcile.ts`.

Preact toolbar presentation lives under `src/table/ui/`:

- `controls.tsx`
- `control-panels.tsx`
- `control-icons.tsx`
- `use-control-panels.ts` owns panel focus, dismissal, and positioning
- `use-transient-status.ts` owns feedback timers and ignores completions after unmount

UI modules may dispatch controller actions and call browser-operation callbacks supplied by
`mount.ts`; they must not own persistent table view state or directly orchestrate feature DOM
mutations.

## State ownership

`TableViewState` is the source of truth for changes that affect the displayed table:

- frozen row and column counts
- manually hidden rows and columns
- filter query and regular expression mode
- sort order
- wrapping
- fitted or manually resized column widths
- draft row selection (eligible row identities and checked identities); applying adds unchecked rows to hidden rows

Short-lived toolbar presentation state, such as the open popup, Focus mode, and success messages,
stays inside the Preact controls. Controls depend on `TableController` for persistent state and
receive browser operations as callbacks; they do not directly mutate table layout.

Pointer hover is transient browser feedback owned by `features/hover.ts`, outside `TableViewState`.
The mount runtime refreshes it after reconciliation and destroys its listeners and pending frame
with the table. It paints only data attributes, coalesces scroll hit testing, and leaves cell
content, geometry, persistent settings, and other feature projections unchanged.

## DOM reconciliation

`reconcileTable` is the only cross-feature DOM orchestrator. It applies changed projections in a
fixed order:

1. sort rows
2. apply hidden rows, hidden columns, and filtering
3. apply wrapping, row-selection controls, and column widths
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
- `table-enhancer.test.ts` covers mounting and dynamically discovered tables.
- `toolbar.test.ts`, `filter.test.ts`, `freeze-defaults.test.ts`, and `layout.test.ts` cover
  feature-focused DOM integration and behavior regressions.
- `ui/controls.test.ts` covers feedback timing and async completion after destruction.
- `page-runtime.test.ts` covers mutation scope and navigation invalidation.
- `test/table-fixture.ts` tracks mounted runtimes and page observers; its cleanup destroys even
  detached runtimes, disconnects observation, restores metadata and browser stubs, and clears the DOM.
- `e2e/table-enhancer.spec.ts` verifies the built extension in Chromium.

New behavior should normally begin with a state transition test, add DOM integration coverage when
it changes a projection, and add E2E coverage when it changes a browser-visible workflow.
