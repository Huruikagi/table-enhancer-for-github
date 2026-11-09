import type { RefObject } from "preact";
import { useLayoutEffect } from "preact/hooks";
import { translate } from "../../i18n";
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
  focusToggleRef: RefObject<HTMLButtonElement | null>,
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

    const inertElements = new Map<Element, string | null>();
    const previousAttributes = new Map(
      ["role", "aria-modal", "aria-label"].map((name) => [name, wrapper.getAttribute(name)]),
    );
    const isolateBackground = (): void => {
      for (
        let current: Element | null = wrapper;
        current?.parentElement;
        current = current.parentElement
      ) {
        for (const sibling of current.parentElement.children) {
          if (sibling === current || inertElements.has(sibling)) continue;
          inertElements.set(sibling, sibling.getAttribute("inert"));
          sibling.setAttribute("inert", "");
        }
        if (current.parentElement === document.body) break;
      }
    };
    let backgroundObserver: MutationObserver | undefined;
    let controlsResizeObserver: ResizeObserver | undefined;

    if (isFocusMode) {
      wrapper.dataset[FOCUS_MODE_DATA_ATTRIBUTE] = "true";
      wrapper.setAttribute("role", "dialog");
      wrapper.setAttribute("aria-modal", "true");
      wrapper.setAttribute("aria-label", translate("focusMode"));
      isolateBackground();
      backgroundObserver = new MutationObserver(isolateBackground);
      backgroundObserver.observe(document.body, { childList: true, subtree: true });
      focusToggleRef.current?.focus();
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
      backgroundObserver?.disconnect();
      for (const [element, value] of inertElements) {
        if (value === null) element.removeAttribute("inert");
        else element.setAttribute("inert", value);
      }
      if (isFocusMode) {
        for (const [name, value] of previousAttributes) {
          if (value === null) wrapper.removeAttribute(name);
          else wrapper.setAttribute(name, value);
        }
      }
    };
  }, [focusToggleRef, isFocusMode, setIsFocusMode, table]);
}
