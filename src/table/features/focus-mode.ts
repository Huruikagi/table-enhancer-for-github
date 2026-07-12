import type { RefObject } from "preact";
import { useLayoutEffect } from "preact/hooks";
import {
  FOCUS_MODE_BODY_CLASS,
  FOCUS_MODE_CONTROLS_HEIGHT_PROPERTY,
  FOCUS_MODE_DATA_ATTRIBUTE,
  TABLE_CONTROLS_CLASS,
  TABLE_WRAPPER_CLASS,
} from "../constants";

export function useTableFocusMode(
  table: HTMLTableElement,
  isFocusMode: boolean,
  setIsFocusMode: (value: boolean) => void,
  focusToggleRef: RefObject<HTMLButtonElement>,
): void {
  useLayoutEffect(() => {
    const wrapper = table.closest<HTMLElement>(`.${TABLE_WRAPPER_CLASS}`);

    if (!wrapper) {
      return;
    }

    const closeFocusMode = (): void => {
      setIsFocusMode(false);
      focusToggleRef.current?.focus();
    };
    const controls = wrapper.querySelector<HTMLElement>(`.${TABLE_CONTROLS_CLASS}`);
    const updateControlsHeight = (): void => {
      if (!controls) {
        return;
      }

      const marginBottom = Number.parseFloat(getComputedStyle(controls).marginBottom) || 0;
      wrapper.style.setProperty(
        FOCUS_MODE_CONTROLS_HEIGHT_PROPERTY,
        `${controls.getBoundingClientRect().height + marginBottom}px`,
      );
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeFocusMode();
      }
    };

    let controlsResizeObserver: ResizeObserver | undefined;

    if (isFocusMode) {
      wrapper.dataset[FOCUS_MODE_DATA_ATTRIBUTE] = "true";
      document.body.classList.add(FOCUS_MODE_BODY_CLASS);
      document.addEventListener("keydown", handleKeyDown);
      updateControlsHeight();

      if (typeof ResizeObserver !== "undefined" && controls) {
        controlsResizeObserver = new ResizeObserver(updateControlsHeight);
        controlsResizeObserver.observe(controls);
      }
    } else {
      delete wrapper.dataset[FOCUS_MODE_DATA_ATTRIBUTE];
      document.body.classList.remove(FOCUS_MODE_BODY_CLASS);
      wrapper.style.removeProperty(FOCUS_MODE_CONTROLS_HEIGHT_PROPERTY);
    }

    return () => {
      delete wrapper.dataset[FOCUS_MODE_DATA_ATTRIBUTE];
      document.body.classList.remove(FOCUS_MODE_BODY_CLASS);
      wrapper.style.removeProperty(FOCUS_MODE_CONTROLS_HEIGHT_PROPERTY);
      document.removeEventListener("keydown", handleKeyDown);
      controlsResizeObserver?.disconnect();
    };
  }, [focusToggleRef, isFocusMode, setIsFocusMode, table]);
}
