import { useSyncExternalStore } from "react";

// How many modals are open, so other UI (the toast) can keep clear of them.
let openModals = 0;
const listeners = new Set();
export const setOpenModals = (change) => {
  openModals += change;
  listeners.forEach((fn) => fn());
};
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
/** True while any Modal (sheet or dialog) is open. */
export const useAnyModalOpen = () => useSyncExternalStore(subscribe, () => openModals > 0, () => false);
