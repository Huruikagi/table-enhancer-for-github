import { useLayoutEffect, useRef, useState } from "preact/hooks";

type PanelName = "copy" | "filter" | "freeze";

/** Owns popup presentation and releases its document/resize listeners on close. */
export function useControlPanels() {
  const [openPanel, setOpenPanel] = useState<PanelName | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const copyToggleRef = useRef<HTMLButtonElement>(null);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const freezeToggleRef = useRef<HTMLButtonElement>(null);
  const copyFirstButtonRef = useRef<HTMLButtonElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const rowsInputRef = useRef<HTMLInputElement>(null);

  const toggles = { copy: copyToggleRef, filter: filterToggleRef, freeze: freezeToggleRef };

  useLayoutEffect(() => {
    if (openPanel === null) return;

    const activeToggle = {
      copy: copyToggleRef,
      filter: filterToggleRef,
      freeze: freezeToggleRef,
    }[openPanel].current;
    const firstControl = {
      copy: copyFirstButtonRef,
      filter: filterInputRef,
      freeze: rowsInputRef,
    }[openPanel].current;
    firstControl?.focus();
    if (openPanel === "freeze") rowsInputRef.current?.select();

    const handlePointerDown = (event: PointerEvent): void => {
      if (
        event.target instanceof Node &&
        !panelRef.current?.contains(event.target) &&
        !activeToggle?.contains(event.target)
      ) {
        setOpenPanel(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);

    const panel = panelRef.current;
    const containingBlock = panel?.offsetParent;
    let resizeObserver: ResizeObserver | undefined;
    const positionPanel = (): void => {
      if (!panel || !activeToggle || !(containingBlock instanceof HTMLElement)) return;
      const maximumLeft = Math.max(0, containingBlock.clientWidth - panel.offsetWidth);
      panel.style.left = `${Math.min(activeToggle.offsetLeft, maximumLeft)}px`;
    };

    if (panel && activeToggle && containingBlock instanceof HTMLElement) {
      positionPanel();
      window.addEventListener("resize", positionPanel);
      resizeObserver = new ResizeObserver(positionPanel);
      resizeObserver.observe(containingBlock);
      resizeObserver.observe(panel);
    }

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", positionPanel);
      resizeObserver?.disconnect();
    };
  }, [openPanel]);

  return {
    openPanel,
    panelRef,
    copyToggleRef,
    filterToggleRef,
    freezeToggleRef,
    copyFirstButtonRef,
    filterInputRef,
    rowsInputRef,
    togglePanel: (panel: PanelName): void => {
      setOpenPanel((current) => (current === panel ? null : panel));
    },
    closePanel: (): void => {
      setOpenPanel(null);
      if (openPanel) toggles[openPanel].current?.focus();
    },
  };
}
