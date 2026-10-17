/** Compatibility exports; page orchestration lives above table discovery. */
export { enhanceTables, startTableEnhancer } from "../page-runtime";
export {
  TABLE_COLUMN_RESIZE_HANDLE_CLASS,
  TABLE_CONTROLS_CLASS,
  TABLE_CONTROLS_PANEL_CLASS,
  TABLE_CONTROLS_TAG,
  TABLE_CONTROLS_TOGGLE_CLASS,
  TABLE_HIDE_BUTTON_CLASS,
  TABLE_WRAPPER_CLASS,
} from "./constants";
export {
  findMarkdownContainer,
  findPreviousHeadingText,
  getRepositoryKey,
  isMarkdownBlobPage,
  normalizeHeadingText,
  wrapTable,
} from "./discovery";
export { applyTableFreeze } from "./features/freeze";
export { applyTableVisibility } from "./features/visibility";
