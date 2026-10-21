import { translate } from "../../i18n";
import {
  HIDE_ACTION_DATA_ATTRIBUTE,
  HIDE_INDEX_DATA_ATTRIBUTE,
  TABLE_HIDE_BUTTON_CLASS,
} from "../constants";

export type HideAction = "hide-column";

export type HideControlClick = {
  action: HideAction;
  index: number;
};

function createHideButton(action: HideAction, index: number): HTMLButtonElement {
  const button = document.createElement("button");
  button.ariaLabel = translate("hideColumn", [index + 1]);
  button.className = `${TABLE_HIDE_BUTTON_CLASS} ${TABLE_HIDE_BUTTON_CLASS}--column`;
  button.dataset[HIDE_ACTION_DATA_ATTRIBUTE] = action;
  button.dataset[HIDE_INDEX_DATA_ATTRIBUTE] = String(index);
  button.title = button.ariaLabel;
  button.type = "button";
  button.textContent = "×";

  return button;
}

export function resetTableHideControls(table: HTMLTableElement): void {
  for (const button of table.querySelectorAll(`.${TABLE_HIDE_BUTTON_CLASS}`)) {
    button.remove();
  }
}

export function installTableHideControls(table: HTMLTableElement): void {
  resetTableHideControls(table);

  const columnControlRow = table.tHead?.rows[0] ?? table.rows[0];

  if (!columnControlRow) {
    return;
  }

  for (const [columnIndex, cell] of Array.from(columnControlRow.cells).entries()) {
    cell.appendChild(createHideButton("hide-column", columnIndex));
  }
}

export function getHideControlClick(
  table: HTMLTableElement,
  target: EventTarget | null,
): HideControlClick | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const button = target.closest<HTMLButtonElement>(`.${TABLE_HIDE_BUTTON_CLASS}`);

  if (!button || !table.contains(button)) {
    return null;
  }

  const action = button.dataset[HIDE_ACTION_DATA_ATTRIBUTE];
  const index = Number(button.dataset[HIDE_INDEX_DATA_ATTRIBUTE]);

  if (action !== "hide-column" || !Number.isInteger(index)) {
    return null;
  }

  return { action, index };
}
