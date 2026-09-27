import { useEffect } from "react";
import { useToast } from "./Toast.jsx";

const OPENED_AT = Date.now();
const AUTO_RELOAD_WINDOW = 10_000;

/**
 * The app is cached for offline use, so after an update the old version can
 * open first. When the new version takes over, reload right away if the app
 * was only just opened; otherwise offer an "Update" button so a reload never
 * interrupts the user. (Unsaved text is still saved when the page reloads.)
 */
export function UpdateNotifier() {
  const toast = useToast();

  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw?.controller) return; // first visit: nothing to update from
    let handled = false;
    const onControllerChange = () => {
      if (handled) return;
      handled = true;
      if (Date.now() - OPENED_AT < AUTO_RELOAD_WINDOW) window.location.reload();
      else toast("New version available", { label: "Update", onClick: () => window.location.reload() });
    };
    sw.addEventListener("controllerchange", onControllerChange);
    return () => sw.removeEventListener("controllerchange", onControllerChange);
  }, [toast]);

  return null;
}
