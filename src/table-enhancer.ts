export const TABLE_WRAPPER_CLASS = "github-table-enhancer-scroll";
export const TABLE_CONTROLS_TAG = "gte-table-controls";
export const TABLE_CONTROLS_CLASS = "github-table-enhancer-controls";
export const TABLE_CONTROLS_PANEL_CLASS = "github-table-enhancer-controls-panel";
export const TABLE_CONTROLS_TOGGLE_CLASS = "github-table-enhancer-controls-toggle";
const STICKY_CELL_DATA_ATTRIBUTE = "githubTableEnhancerSticky";
const STICKY_CELL_SELECTOR = "[data-github-table-enhancer-sticky='true']";
const FROZEN_ROWS_DATA_ATTRIBUTE = "githubTableEnhancerFrozenRows";
const FREEZE_CHANGE_EVENT = "gte:freeze-change";
const STICKY_TOP_PROPERTY = "--gte-sticky-top";
const STICKY_LEFT_PROPERTY = "--gte-sticky-left";
const STICKY_Z_INDEX_PROPERTY = "--gte-sticky-z-index";

type FreezeOptions = {
  rows: number;
  columns: number;
};

type FreezeChangeEvent = CustomEvent<FreezeOptions>;
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

export class TableControlsElement extends HTMLElement {
  #isOpen = false;
  #values: FreezeOptions = { rows: 0, columns: 0 };
  #limits: FreezeOptions = { rows: 0, columns: 0 };
  #rowsInput: HTMLInputElement | null = null;
  #columnsInput: HTMLInputElement | null = null;

  connectedCallback(): void {
    this.classList.add(TABLE_CONTROLS_CLASS);
    this.render();
  }

  setLimits({ rows, columns }: FreezeOptions): void {
    this.#limits = { rows, columns };
    this.setValues(this.#values);
    this.updateInputLimits();
  }

  get values(): FreezeOptions {
    return { ...this.#values };
  }

  private render(): void {
    this.replaceChildren();

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = TABLE_CONTROLS_TOGGLE_CLASS;
    toggle.setAttribute("aria-expanded", String(this.#isOpen));
    toggle.textContent = "Freeze";
    toggle.addEventListener("click", () => {
      this.#isOpen = !this.#isOpen;
      this.render();
    });

    this.append(toggle);

    if (!this.#isOpen) {
      return;
    }

    const panel = document.createElement("div");
    panel.className = TABLE_CONTROLS_PANEL_CLASS;

    this.#rowsInput = this.createNumberInput("rows", "Frozen rows");
    this.#columnsInput = this.createNumberInput("columns", "Frozen columns");

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.textContent = "Reset";
    resetButton.addEventListener("click", () => {
      this.setValues({ rows: 0, columns: 0 });
      this.syncInputs();
      this.dispatchFreezeChange();
    });

    panel.append(
      this.createInputLabel("Rows", this.#rowsInput),
      this.createInputLabel("Columns", this.#columnsInput),
      resetButton,
    );
    this.append(panel);
  }

  private createNumberInput(kind: FreezeInputKind, label: string): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = String(this.#limits[kind]);
    input.value = String(this.#values[kind]);
    input.inputMode = "numeric";
    input.setAttribute("aria-label", label);
    input.addEventListener("change", () => {
      this.updateValueFromInput(kind, input);
      this.dispatchFreezeChange();
    });

    return input;
  }

  private setValues(values: FreezeOptions): void {
    this.#values = {
      rows: clampInteger(values.rows, 0, this.#limits.rows),
      columns: clampInteger(values.columns, 0, this.#limits.columns),
    };
  }

  private updateValueFromInput(kind: FreezeInputKind, input: HTMLInputElement): void {
    const clampedValue = clampInteger(Number(input.value), 0, this.#limits[kind]);
    this.#values = {
      ...this.#values,
      [kind]: clampedValue,
    };
    input.value = String(clampedValue);
  }

  private updateInputLimits(): void {
    if (this.#rowsInput) {
      this.#rowsInput.max = String(this.#limits.rows);
    }

    if (this.#columnsInput) {
      this.#columnsInput.max = String(this.#limits.columns);
    }
  }

  private syncInputs(): void {
    if (this.#rowsInput) {
      this.#rowsInput.value = String(this.#values.rows);
    }

    if (this.#columnsInput) {
      this.#columnsInput.value = String(this.#values.columns);
    }
  }

  private createInputLabel(text: string, input: HTMLInputElement): HTMLLabelElement {
    const label = document.createElement("label");
    label.append(text, input);
    return label;
  }

  private dispatchFreezeChange(): void {
    this.dispatchEvent(
      new CustomEvent<FreezeOptions>(FREEZE_CHANGE_EVENT, {
        bubbles: true,
        detail: this.values,
      }),
    );
  }
}

function getCustomElementRegistry(): CustomElementRegistry | null {
  return window.customElements ?? null;
}

export function defineTableControlsElement(): boolean {
  const registry = getCustomElementRegistry();

  if (!registry) {
    return false;
  }

  if (!registry.get(TABLE_CONTROLS_TAG)) {
    registry.define(TABLE_CONTROLS_TAG, TableControlsElement);
  }

  return true;
}

function createFallbackTableControls(table: HTMLTableElement): HTMLElement {
  const controls = document.createElement(TABLE_CONTROLS_TAG);
  controls.classList.add(TABLE_CONTROLS_CLASS);

  let isOpen = false;
  let values: FreezeOptions = { rows: 0, columns: 0 };
  const limits: FreezeOptions = {
    rows: table.rows.length,
    columns: table.rows[0]?.cells.length ?? 0,
  };

  const setValues = (nextValues: FreezeOptions): void => {
    values = {
      rows: clampInteger(nextValues.rows, 0, limits.rows),
      columns: clampInteger(nextValues.columns, 0, limits.columns),
    };
  };

  const applyValues = (): void => {
    applyTableFreeze(table, values);
  };

  const render = (): void => {
    controls.replaceChildren();

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = TABLE_CONTROLS_TOGGLE_CLASS;
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = "Freeze";
    toggle.addEventListener("click", () => {
      isOpen = !isOpen;
      render();
    });
    controls.append(toggle);

    if (!isOpen) {
      return;
    }

    const panel = document.createElement("div");
    panel.className = TABLE_CONTROLS_PANEL_CLASS;

    const createInput = (kind: FreezeInputKind, labelText: string): HTMLInputElement => {
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = String(limits[kind]);
      input.value = String(values[kind]);
      input.inputMode = "numeric";
      input.setAttribute("aria-label", labelText);
      input.addEventListener("change", () => {
        setValues({ ...values, [kind]: Number(input.value) });
        input.value = String(values[kind]);
        applyValues();
      });

      return input;
    };

    const rowsInput = createInput("rows", "Frozen rows");
    const columnsInput = createInput("columns", "Frozen columns");
    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.textContent = "Reset";
    resetButton.addEventListener("click", () => {
      setValues({ rows: 0, columns: 0 });
      render();
      applyValues();
    });

    const rowsLabel = document.createElement("label");
    rowsLabel.append("Rows", rowsInput);
    const columnsLabel = document.createElement("label");
    columnsLabel.append("Columns", columnsInput);
    panel.append(rowsLabel, columnsLabel, resetButton);
    controls.append(panel);
  };

  render();

  return controls;
}

function createTableControls(table: HTMLTableElement): HTMLElement {
  if (!defineTableControlsElement()) {
    return createFallbackTableControls(table);
  }

  const controls = document.createElement(TABLE_CONTROLS_TAG) as TableControlsElement;
  controls.setLimits({
    rows: table.rows.length,
    columns: table.rows[0]?.cells.length ?? 0,
  });
  controls.addEventListener(FREEZE_CHANGE_EVENT, (event) => {
    applyTableFreeze(table, (event as FreezeChangeEvent).detail);
  });

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
