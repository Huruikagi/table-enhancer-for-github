import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { FOCUS_MODE_BODY_CLASS, TABLE_HIDE_BUTTON_CLASS } from "./constants";
import { wrapTable } from "./enhancer";
import { destroyDetachedTableSessions } from "./lifecycle";

describe("table session lifecycle", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.body.classList.remove(FOCUS_MODE_BODY_CLASS);
    window.history.replaceState(null, "", "/owner/repo/blob/main/docs/index.md");
  });

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
      act(() => destroyDetachedTableSessions(wrapper));
    }

    expect(table.dataset.githubTableEnhancer).toBeUndefined();
    expect(table.querySelector(`.${TABLE_HIDE_BUTTON_CLASS}`)).toBeNull();
    expect(document.body.classList.contains(FOCUS_MODE_BODY_CLASS)).toBe(false);
  });
});
