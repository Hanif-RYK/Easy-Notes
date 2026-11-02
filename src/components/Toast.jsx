import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAnyModalOpen } from "../lib/modalStack.js";

const ToastContext = createContext(() => {});

/**
 * Short message at the bottom of the screen.
 * toast("Saved") or toast("Moved to Trash", { label: "Undo", onClick: undo })
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  // Never cover an open sheet or dialog: show the toast at the top instead.
  const modalOpen = useAnyModalOpen();

  const show = useCallback((message, action) => {
    clearTimeout(timer.current);
    setToast({ message, action, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), action ? 5000 : 2600);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 print:hidden ${
          modalOpen ? "top-[max(1rem,env(safe-area-inset-top))]" : "bottom-24"
        }`}
      >
        {toast && (
          <div
            key={toast.key}
            className="animate-pop-in pointer-events-auto flex items-center gap-3 rounded-full bg-slate-900 py-2.5 pr-2.5 pl-4 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-slate-900"
          >
            <span className={toast.action ? "" : "pr-1.5"}>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  clearTimeout(timer.current);
                  setToast(null);
                  toast.action.onClick();
                }}
                className="rounded-full px-3 py-1 font-semibold text-indigo-300 hover:bg-white/10 dark:text-indigo-600 dark:hover:bg-slate-900/10"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
