import { describe, expect, it } from "vitest";
import { createInitialTableViewState, reduceTableViewState, type TableViewState } from "./state";

const limits = { rows: 5, columns: 4 };

describe("reduceTableViewState", () => {
  it("keeps drafts separate and applies unchecked rows without replacing existing hidden rows", () => {
    let state: TableViewState = {
      ...createInitialTableViewState(),
      hiddenRows: [4],
      hiddenColumns: [1],
    };
    state = reduceTableViewState(state, { type: "rowSelectionStarted", rows: [1, 2, 3] }, limits);
    state = reduceTableViewState(state, { type: "rowSelectionToggled", index: 2 }, limits);
    expect(state.hiddenRows).toEqual([4]);
    state = reduceTableViewState(state, { type: "rowSelectionApplied" }, limits);
    expect(state.hiddenRows).toEqual([2, 4]);
    expect(state.hiddenColumns).toEqual([1]);
    expect(state.rowSelection).toBeNull();
  });

  it("ignores rows outside the draft scope and discards a cancelled draft", () => {
    const initial = createInitialTableViewState();
    let state = reduceTableViewState(
      initial,
      { type: "rowSelectionStarted", rows: [2, 3] },
      limits,
    );
    const before = state;
    state = reduceTableViewState(state, { type: "rowSelectionToggled", index: 99 }, limits);
    expect(state).toBe(before);
    state = reduceTableViewState(state, { type: "rowSelectionAllToggled" }, limits);
    expect(state.rowSelection?.selected).toEqual([]);
    state = reduceTableViewState(state, { type: "rowSelectionCancelled" }, limits);
    expect(state).toEqual(initial);
  });
  it("keeps all persistent table view state in one value", () => {
    let state = createInitialTableViewState();

    state = reduceTableViewState(state, { type: "rowSelectionStarted", rows: [2, 3] }, limits);
    state = reduceTableViewState(state, { type: "rowSelectionToggled", index: 3 }, limits);
    state = reduceTableViewState(state, { type: "rowSelectionApplied" }, limits);
    state = reduceTableViewState(state, { type: "columnHidden", index: 1 }, limits);
    state = reduceTableViewState(state, { type: "filterQueryChanged", value: "ready" }, limits);
    state = reduceTableViewState(
      state,
      { type: "sortChanged", value: { column: 0, direction: "ascending" } },
      limits,
    );
    state = reduceTableViewState(state, { type: "wrapChanged", value: true }, limits);

    expect(state).toMatchObject({
      hiddenRows: [3],
      hiddenColumns: [1],
      filterQuery: "ready",
      sort: { column: 0, direction: "ascending" },
      isWrapped: true,
    });
  });

  it("clamps freeze values to the table limits", () => {
    const state = reduceTableViewState(
      createInitialTableViewState(),
      { type: "freezeChanged", value: { rows: 9, columns: -2 } },
      limits,
    );

    expect(state.freeze).toEqual({ rows: 5, columns: 0 });
  });

  it("applies fit as one state transition", () => {
    const state = reduceTableViewState(
      createInitialTableViewState(),
      { type: "fitApplied", widths: [120, 240] },
      limits,
    );

    expect(state.isWrapped).toBe(true);
    expect(state.columnWidths).toEqual([120, 240]);
  });

  it("resets the complete table view state", () => {
    const changed = reduceTableViewState(
      createInitialTableViewState(),
      { type: "filterQueryChanged", value: "node" },
      limits,
    );

    expect(reduceTableViewState(changed, { type: "reset" }, limits)).toEqual(
      createInitialTableViewState(),
    );
  });
});
