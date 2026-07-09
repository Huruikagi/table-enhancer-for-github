import type { VNode } from "preact";
import { render } from "preact";
import { useId, useState } from "preact/hooks";

export const TABLE_WRAPPER_CLASS = "github-table-enhancer-scroll";
export const TABLE_CONTROLS_TAG = "gte-table-controls";
export const TABLE_CONTROLS_CLASS = "github-table-enhancer-controls";
export const TABLE_CONTROLS_PANEL_CLASS = "github-table-enhancer-controls-panel";
export const TABLE_CONTROLS_TOGGLE_CLASS = "github-table-enhancer-controls-toggle";
const STICKY_CELL_DATA_ATTRIBUTE = "githubTableEnhancerSticky";
const STICKY_CELL_SELECTOR = "[data-github-table-enhancer-sticky='true']";
const FROZEN_ROWS_DATA_ATTRIBUTE = "githubTableEnhancerFrozenRows";
const STICKY_TOP_PROPERTY = "--gte-sticky-top";
const STICKY_LEFT_PROPERTY = "--gte-sticky-left";
const STICKY_Z_INDEX_PROPERTY = "--gte-sticky-z-index";

type FreezeOptions = {
  rows: number;
  columns: number;
};

type FreezeInputKind = keyof FreezeOptions;
type StickyCellLayout = {
  cell: HTMLTableCellElement;
  top: number | null;
  left: number | null;
  zIndex: number;
};

export function isMarkdownBlobPage(pathname = window.location.pathname): boolean {
  return /^\/[^/]+\/[^/]+\/blob\/.+\.md$/i.test(pathname);
}

export function findMarkdownContainer(root: ParentNode = document): ParentNode {
  return (
    root.querySelector(".markdown-body") ?? root.querySelector("[data-testid='readme']") ?? root
  );
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.trunc(value), min), max);
}

type TableControlsProps = {
  limits: FreezeOptions;
  onChange: (values: FreezeOptions) => void;
};

function TableControls({ limits, onChange }: TableControlsProps): VNode {
  const inputIdPrefix = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<FreezeOptions>({ rows: 0, columns: 0 });

  const updateValues = (nextValues: FreezeOptions): FreezeOptions => {
    const clampedValues = {
      rows: clampInteger(nextValues.rows, 0, limits.rows),
      columns: clampInteger(nextValues.columns, 0, limits.columns),
    };

    setValues(clampedValues);
    onChange(clampedValues);

    return clampedValues;
  };

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
        </div>
      )}
    </>
  );
}

function createTableControls(table: HTMLTableElement): HTMLElement {
  const controls = document.createElement(TABLE_CONTROLS_TAG);
  controls.classList.add(TABLE_CONTROLS_CLASS);
  render(
    <TableControls
      limits={{
        rows: table.rows.length,
        columns: table.rows[0]?.cells.length ?? 0,
      }}
      onChange={(values) => applyTableFreeze(table, values)}
    />,
    controls,
  );

  return controls;
}

export function wrapTable(table: HTMLTableElement): void {
  if (table.dataset.githubTableEnhancer === "true") {
    return;
  }

  const parent = table.parentElement;
  if (!parent || parent.classList.contains(TABLE_WRAPPER_CLASS)) {
    table.dataset.githubTableEnhancer = "true";
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = TABLE_WRAPPER_CLASS;
  const controls = createTableControls(table);
  table.dataset.githubTableEnhancer = "true";
  parent.insertBefore(wrapper, table);
  wrapper.appendChild(controls);
  wrapper.appendChild(table);
}

function resetTableFreeze(table: HTMLTableElement): void {
  const stickyCells = table.querySelectorAll<HTMLElement>(STICKY_CELL_SELECTOR);

  for (const cell of stickyCells) {
    delete cell.dataset[STICKY_CELL_DATA_ATTRIBUTE];
    cell.style.removeProperty(STICKY_TOP_PROPERTY);
    cell.style.removeProperty(STICKY_LEFT_PROPERTY);
    cell.style.removeProperty(STICKY_Z_INDEX_PROPERTY);
  }
}

function setFrozenRowsState(table: HTMLTableElement, frozenRows: number): void {
  const wrapper = table.closest<HTMLElement>(`.${TABLE_WRAPPER_CLASS}`);

  if (!wrapper) {
    return;
  }

  if (frozenRows > 0) {
    wrapper.dataset[FROZEN_ROWS_DATA_ATTRIBUTE] = "true";
  } else {
    delete wrapper.dataset[FROZEN_ROWS_DATA_ATTRIBUTE];
  }
}

function getNormalizedFreezeOptions(
  table: HTMLTableElement,
  options: FreezeOptions,
): FreezeOptions {
  const rows = Array.from(table.rows);

  return {
    rows: clampInteger(options.rows, 0, rows.length),
    columns: clampInteger(options.columns, 0, rows[0]?.cells.length ?? 0),
  };
}

function getStickyZIndex(isFrozenRow: boolean, isFrozenColumn: boolean): number {
  if (isFrozenRow && isFrozenColumn) {
    return 4;
  }

  if (isFrozenRow) {
    return 3;
  }

  return 2;
}

function getStickyCellLayouts(table: HTMLTableElement, options: FreezeOptions): StickyCellLayout[] {
  const rows = Array.from(table.rows);
  const layouts: StickyCellLayout[] = [];
  let top = 0;

  rows.forEach((row, rowIndex) => {
    const isFrozenRow = rowIndex < options.rows;
    let left = 0;

    Array.from(row.cells).forEach((cell, columnIndex) => {
      const isFrozenColumn = columnIndex < options.columns;

      if (!isFrozenRow && !isFrozenColumn) {
        return;
      }

      layouts.push({
        cell,
        top: isFrozenRow ? top : null,
        left: isFrozenColumn ? left : null,
        zIndex: getStickyZIndex(isFrozenRow, isFrozenColumn),
      });

      if (isFrozenColumn) {
        left += cell.getBoundingClientRect().width;
      }
    });

    if (isFrozenRow) {
      top += row.getBoundingClientRect().height;
    }
  });

  return layouts;
}

function applyStickyCellLayout({ cell, top, left, zIndex }: StickyCellLayout): void {
  cell.dataset[STICKY_CELL_DATA_ATTRIBUTE] = "true";
  cell.style.setProperty(STICKY_Z_INDEX_PROPERTY, String(zIndex));

  if (top !== null) {
    cell.style.setProperty(STICKY_TOP_PROPERTY, `${top}px`);
  }

  if (left !== null) {
    cell.style.setProperty(STICKY_LEFT_PROPERTY, `${left}px`);
  }
}

export function applyTableFreeze(table: HTMLTableElement, options: FreezeOptions): void {
  resetTableFreeze(table);

  const normalizedOptions = getNormalizedFreezeOptions(table, options);
  setFrozenRowsState(table, normalizedOptions.rows);

  if (normalizedOptions.rows === 0 && normalizedOptions.columns === 0) {
    return;
  }

  for (const layout of getStickyCellLayouts(table, normalizedOptions)) {
    applyStickyCellLayout(layout);
  }
}

export function enhanceTables(root: ParentNode = document): void {
  if (!isMarkdownBlobPage()) {
    return;
  }

  const markdownContainer = findMarkdownContainer(root);
  const tables = Array.from(markdownContainer.querySelectorAll<HTMLTableElement>("table"));

  if (markdownContainer instanceof HTMLTableElement) {
    tables.unshift(markdownContainer);
  }

  tables.forEach(wrapTable);
}

export function startTableEnhancer(): MutationObserver {
  enhanceTables();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          enhanceTables(node);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return observer;
}
