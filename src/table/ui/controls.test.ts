import { act } from "preact/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTableFixture } from "../../test/table-fixture";
import { mountTableRuntime, type TableRuntime } from "../mount";

useTableFixture();

let runtime: TableRuntime | undefined;

afterEach(() => {
  runtime = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mountControls(copy: () => Promise<void>): void {
  document.body.innerHTML = "<div><table><tbody><tr><td>value</td></tr></tbody></table></div>";
  const table = document.querySelector("table");
  if (!table) throw new Error("Expected a table");
  act(() => {
    runtime = mountTableRuntime(table, { copy });
    table.before(runtime.controls);
  });
  act(() => document.querySelector<HTMLButtonElement>('button[aria-label="Copy as"]')?.click());
}

async function copyMarkdown(): Promise<void> {
  await act(async () => {
    const button = Array.from(document.querySelectorAll("button")).find((candidate) =>
      /^(Markdown|Copied Markdown)$/.test(candidate.textContent ?? ""),
    );
    if (!button) throw new Error("Expected Markdown copy action");
    button.click();
  });
}

describe("table control feedback", () => {
  it("keeps repeated copy feedback visible for the full duration after the latest copy", async () => {
    vi.useFakeTimers();
    mountControls(async () => {});
    await copyMarkdown();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    await copyMarkdown();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(runtime?.controls.textContent).toContain("Copied Markdown");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(runtime?.controls.textContent).not.toContain("Copied Markdown");
  });

  it("clears feedback timers when the table is destroyed", async () => {
    vi.useFakeTimers();
    const schedule = vi.spyOn(window, "setTimeout");
    const cancel = vi.spyOn(window, "clearTimeout");
    mountControls(async () => {});
    await copyMarkdown();
    const feedbackTimerIndex = schedule.mock.calls.findIndex(([, delay]) => delay === 1500);
    expect(feedbackTimerIndex).toBeGreaterThanOrEqual(0);
    const feedbackTimer = schedule.mock.results[feedbackTimerIndex].value;
    act(() => runtime?.destroy());
    expect(cancel).toHaveBeenCalledWith(feedbackTimer);
  });

  it("does not schedule feedback when a copy completes after the table is destroyed", async () => {
    vi.useFakeTimers();
    const schedule = vi.spyOn(window, "setTimeout");
    let complete = (): void => {};
    mountControls(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    await copyMarkdown();
    act(() => runtime?.destroy());
    schedule.mockClear();
    await act(async () => complete());
    expect(schedule.mock.calls.some(([, delay]) => delay === 1500)).toBe(false);
  });
});
