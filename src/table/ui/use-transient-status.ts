import { useCallback, useLayoutEffect, useRef, useState } from "preact/hooks";

/** Replaces old feedback timers and ignores async completions after unmount. */
export function useTransientStatus<T>(
  initialStatus: T,
): [T, (value: T, duration?: number) => void] {
  const [status, setStatus] = useState(initialStatus);
  const timer = useRef<number | undefined>(undefined);
  const active = useRef(true);

  useLayoutEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const updateStatus = useCallback(
    (value: T, duration?: number): void => {
      if (!active.current) return;
      window.clearTimeout(timer.current);
      setStatus(value);
      if (duration !== undefined) {
        timer.current = window.setTimeout(() => setStatus(initialStatus), duration);
      }
    },
    [initialStatus],
  );

  return [status, updateStatus];
}
