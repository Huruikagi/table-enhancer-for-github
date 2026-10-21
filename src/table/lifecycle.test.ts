import { act } from "preact/test-utils";
import { describe, expect, it } from "vitest";
import { useTableFixture } from "../test/table-fixture";
import { FOCUS_MODE_BODY_CLASS, TABLE_CONTROLS_TAG, TABLE_HIDE_BUTTON_CLASS } from "./constants";
import { wrapTable } from "./enhancer";
import { destroyDetachedTableRuntimes, destroyManagedTable } from "./lifecycle";

const { startTableEnhancer, cleanup } = useTableFixture();

describe("table session lifecycle", () => {
  it("unmounts controls and removes table behaviors when its wrapper is detached", () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <table><tbody><tr><td>one</td><td>two</td></tr></tbody></table>
      </article>
    `;
    const table = document.querySelector("table");

    if (!(table instanceof HTMLTableElement)) {
      throw new Error("Expected a table");
    }

    wrapTable(table);
    const wrapper = table.parentElement;
    const expand = wrapper?.querySelector<HTMLButtonElement>("button[aria-label='Expand']");

    act(() => expand?.click());
    expect(document.body.classList.contains(FOCUS_MODE_BODY_CLASS)).toBe(true);

    wrapper?.remove();
    if (wrapper) {
      act(() => destroyDetachedTableRuntimes(wrapper));
    }

    expect(table.dataset.githubTableEnhancer).toBeUndefined();
    expect(table.querySelector(`.${TABLE_HIDE_BUTTON_CLASS}`)).toBeNull();
    expect(document.body.classList.contains(FOCUS_MODE_BODY_CLASS)).toBe(false);
  });

  it("mounts a fresh runtime without duplicating controls after destroy", () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <table><tbody><tr><td>one</td><td>two</td></tr></tbody></table>
      </article>
    `;
    const table = document.querySelector("table");

    if (!(table instanceof HTMLTableElement)) {
      throw new Error("Expected a table");
    }

    wrapTable(table);
    destroyManagedTable(table);
    wrapTable(table);

    expect(table.parentElement?.querySelectorAll(TABLE_CONTROLS_TAG)).toHaveLength(1);
    expect(table.querySelectorAll(`.${TABLE_HIDE_BUTTON_CLASS}`)).toHaveLength(2);
  });

  it("destroys a runtime when the page observer sees GitHub detach its wrapper", async () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <table><tbody><tr><td>one</td><td>two</td></tr></tbody></table>
      </article>
    `;
    const observer = startTableEnhancer();
    const table = document.querySelector("table");
    const wrapper = table?.parentElement;
    const expand = wrapper?.querySelector<HTMLButtonElement>("button[aria-label='Expand']");

    act(() => expand?.click());
    wrapper?.remove();
    await act(async () => Promise.resolve());
    observer.disconnect();

    expect(table?.dataset.githubTableEnhancer).toBeUndefined();
    expect(document.body.classList.contains(FOCUS_MODE_BODY_CLASS)).toBe(false);
  });

  it("cleans up detached tables and disconnects observation through the shared fixture", async () => {
    document.body.innerHTML =
      '<article class="markdown-body"><table><tr><td>one</td></tr></table></article>';
    startTableEnhancer();
    const table = document.querySelector("table");
    const expand = document.querySelector<HTMLButtonElement>('button[aria-label="Expand"]');
    act(() => expand?.click());
    expect(document.body.classList.contains(FOCUS_MODE_BODY_CLASS)).toBe(true);
    table?.parentElement?.remove();

    cleanup();

    expect(table?.dataset.githubTableEnhancer).toBeUndefined();
    expect(document.body.classList.contains(FOCUS_MODE_BODY_CLASS)).toBe(false);
    document.body.innerHTML =
      '<article class="markdown-body"><table><tr><td>next</td></tr></table></article>';
    await act(async () => Promise.resolve());
    expect(document.querySelector(TABLE_CONTROLS_TAG)).toBeNull();
  });
});
