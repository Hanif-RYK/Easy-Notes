import { useEffect, useRef } from "react";

const WRITE_DELAY = 800;

/**
 * Writes `value` with `save` shortly after it stops changing, instead of on
 * every change. Serialising all notes is expensive, so batching the writes
 * keeps typing smooth. Pending writes are flushed when the page is hidden or
 * closed, so nothing is lost.
 */
export function usePersist(value, save, enabled = true) {
  const latest = useRef(value);
  latest.current = value; // always the newest value, even before effects run
  const pending = useRef(false);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!enabled) return;
    pending.current = true;
    const timer = setTimeout(() => {
      pending.current = false;
      saveRef.current(latest.current);
    }, WRITE_DELAY);
    return () => clearTimeout(timer);
  }, [value, enabled]);

  useEffect(() => {
    const flush = () => {
      if (!pending.current) return;
      pending.current = false;
      saveRef.current(latest.current);
    };
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, []);
}
