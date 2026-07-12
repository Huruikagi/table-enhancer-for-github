import { describe, expect, it } from "vitest";
import { createInitialTableViewState, reduceTableViewState } from "./state";

const limits = { rows: 5, columns: 4 };

describe("reduceTableViewState", () => {
  it("keeps all persistent table view state in one value", () => {
    let state = createInitialTableViewState();

    state = reduceTableViewState(state, { type: "rowHidden", index: 3 }, limits);
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
