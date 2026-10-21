import { act } from "preact/test-utils";
import { afterEach, beforeEach, vi } from "vitest";
import { reconcileFrontmatter } from "../frontmatter/runtime";
import { startTableEnhancer as startPageEnhancer } from "../page-runtime";
import { TABLE_CONTROLS_TAG } from "../table/constants";
import { destroyManagedTable } from "../table/lifecycle";
import * as mount from "../table/mount";

/** Tracks mounted runtimes even after their tables leave the document. */
export function useTableFixture() {
  const observers = new Set<ReturnType<typeof startPageEnhancer>>();
  let cleanup = (): void => {};

  beforeEach(() => {
    document.body.replaceChildren();
    window.history.replaceState(null, "", "/owner/repo/blob/main/docs/index.md");
    const chromeDescriptor = Object.getOwnPropertyDescriptor(globalThis, "chrome");
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    const originalMount = mount.mountTableRuntime;
    const runtimes = new Set<ReturnType<typeof originalMount>>();
    const mounts = vi.spyOn(mount, "mountTableRuntime").mockImplementation((...args) => {
      const runtime = originalMount(...args);
      runtimes.add(runtime);
      return runtime;
    });

    cleanup = (): void => {
      for (const observer of observers) observer.disconnect();
      observers.clear();
      act(() => {
        for (const runtime of runtimes) {
          destroyManagedTable(runtime.table);
          runtime.destroy();
        }
      });
      runtimes.clear();
      document.body.replaceChildren();
      reconcileFrontmatter();
      mounts.mockRestore();
      if (chromeDescriptor) Object.defineProperty(globalThis, "chrome", chromeDescriptor);
      else Reflect.deleteProperty(globalThis, "chrome");
      if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
      else Reflect.deleteProperty(navigator, "clipboard");
    };
  });
  afterEach(() => cleanup());

  return {
    cleanup: (): void => cleanup(),
    startTableEnhancer: (): ReturnType<typeof startPageEnhancer> => {
      const observer = startPageEnhancer();
      observers.add(observer);
      return observer;
    },
  };
}

export const STICKY_CELL_DATA_ATTRIBUTE = "githubTableEnhancerSticky";
export const HIDDEN_ROW_DATA_ATTRIBUTE = "githubTableEnhancerHiddenRow";
export const HIDDEN_COLUMN_DATA_ATTRIBUTE = "githubTableEnhancerHiddenColumn";
export const FILTERED_ROW_DATA_ATTRIBUTE = "githubTableEnhancerFilteredRow";
export const STICKY_TOP_PROPERTY = "--gte-sticky-top";
export const STICKY_LEFT_PROPERTY = "--gte-sticky-left";
export const STICKY_Z_INDEX_PROPERTY = "--gte-sticky-z-index";
export const FREEZE_RULE_SETTINGS_STORAGE_KEY = "githubTableEnhancerFreezeRuleSettings";

type FakeChromeStorage = Record<string, unknown>;

export function installFakeClipboard(): { writeText: ReturnType<typeof vi.fn> } {
  const clipboard = {
    writeText: vi.fn(async () => {}),
  };

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: clipboard,
  });

  return clipboard;
}

export function installFakeChromeStorage(
  initialStorage: FakeChromeStorage = {},
  options: { setDelayMs?: number } = {},
): FakeChromeStorage {
  const storage = { ...initialStorage };

  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      storage: {
        local: {
          async get(key: string): Promise<Record<string, unknown>> {
            return { [key]: storage[key] };
          },
          async set(items: Record<string, unknown>): Promise<void> {
            if (options.setDelayMs !== undefined) {
              await new Promise((resolve) => setTimeout(resolve, options.setDelayMs));
            }

            Object.assign(storage, items);
          },
        },
      },
    },
  });

  return storage;
}

export async function flushPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

export function setPathname(pathname: string): void {
  window.history.replaceState(null, "", pathname);
}

export function renderMarkdownTables(markup: string): void {
  document.body.innerHTML = `<article class="markdown-body">${markup}</article>`;
}

export function getTable(selector = "table"): HTMLTableElement {
  const table = document.querySelector(selector);

  if (!(table instanceof HTMLTableElement)) {
    throw new Error(`Expected ${selector} to match a table`);
  }

  return table;
}

export function openFreezeControls(): void {
  act(() => {
    document.querySelector<HTMLButtonElement>(`${TABLE_CONTROLS_TAG} button`)?.click();
  });
}

export function getInput(label: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(`input[aria-label='${label}']`);

  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Expected ${label} input to be rendered`);
  }

  return input;
}

export function getFreezeInput(label: string): HTMLInputElement {
  return getInput(label);
}

export function setFreezeInput(label: string, value: string): void {
  const input = getFreezeInput(label);
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

export function setFilterInput(value: string): void {
  const input = getInput("Filter rows");
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

export function clickButton(label: string): void {
  const button =
    document.querySelector<HTMLButtonElement>(`button[aria-label='${label}']`) ??
    Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (candidate) => candidate.textContent === label,
    );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected ${label} button to be rendered`);
  }

  act(() => {
    button.click();
  });
}

export function getButton(label: string): HTMLButtonElement {
  const button =
    document.querySelector<HTMLButtonElement>(`button[aria-label='${label}']`) ??
    Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (candidate) => candidate.textContent === label,
    );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected ${label} button to be rendered`);
  }

  return button;
}

export function hideRow(rowNumber: number): void {
  clickButton("Select rows");
  act(() => getInput(`Select row ${rowNumber}`).click());
  clickButton("Show selected rows");
}

export function createRect(width: number): DOMRect {
  return {
    bottom: 0,
    height: 0,
    left: 0,
    right: width,
    top: 0,
    width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
}
