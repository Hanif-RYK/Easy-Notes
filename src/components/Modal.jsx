import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * Accessible overlay. `variant="sheet"` slides up from the bottom on phones
 * (and shows as a centred card on larger screens); `variant="dialog"` is
 * always a centred card. Closes on Escape and on backdrop click.
 */
export function Modal({ open, onClose, title, variant = "sheet", children }) {
  const panelRef = useRef(null);
  const titleId = useId();
  // Keep the latest onClose without re-running the focus effect on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const onKey = (e) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    // Move focus into the panel unless a child (e.g. an input) already took it.
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open]);

  if (!open) return null;

  const sheet = variant === "sheet";

  return (
    <div
      className={`animate-fade-in fixed inset-0 z-50 flex bg-slate-950/50 backdrop-blur-[2px] print:hidden ${
        sheet ? "items-end sm:items-center sm:justify-center sm:p-4" : "items-center justify-center p-4"
      }`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`w-full bg-white shadow-2xl outline-none dark:bg-slate-900 ${
          sheet
            ? "animate-slide-up max-h-[85dvh] overflow-y-auto rounded-t-3xl px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:animate-pop-in sm:rounded-3xl sm:pt-5"
            : "animate-pop-in max-w-sm rounded-2xl p-6"
        }`}
      >
        {sheet && <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden dark:bg-slate-700" />}
        {title && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id={titleId} className="truncate text-base font-semibold text-slate-900 dark:text-white">
              {title}
            </h2>
            {sheet && (
              <button type="button" onClick={onClose} className="icon-btn -mr-2 h-9 w-9" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** List of actions shown in a bottom sheet (used for the ⋯ menus). */
export function ActionSheet({ open, onClose, title, actions }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="-mx-2 flex flex-col">
        {actions.map(({ label, icon: Icon, onClick, danger }) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              onClose();
              onClick();
            }}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
              danger ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Delete" }) {
  return (
    <Modal open={open} onClose={onClose} title={title} variant="dialog">
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onConfirm();
          }}
          className="btn-danger flex-1"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/** Dialog with a single text field, used for renaming. */
export function PromptDialog({ open, onClose, onSubmit, title, label, initialValue = "", submitLabel = "Save" }) {
  const [value, setValue] = useState(initialValue);
  const inputId = useId();

  // Reset the field each time the dialog opens.
  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const trimmed = value.trim();

  return (
    <Modal open={open} onClose={onClose} title={title} variant="dialog">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed) return;
          onClose();
          onSubmit(trimmed);
        }}
      >
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </label>
        <input
          id={inputId}
          className="input"
          value={value}
          maxLength={120}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.target.select()}
          autoFocus
        />
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={!trimmed} className="btn-primary flex-1">
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
