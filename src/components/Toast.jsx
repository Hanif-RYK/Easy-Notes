import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();

  const show = useCallback((message) => {
    clearTimeout(timer.current);
    setToast({ message, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 print:hidden"
      >
        {toast && (
          <div
            key={toast.key}
            className="animate-pop-in rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-slate-900"
          >
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
