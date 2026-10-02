import { useState } from "react";
import { ArrowLeft, FileText, Folder, Image as ImageIcon, RotateCcw, StickyNote, Trash2, X } from "lucide-react";
import { goBack } from "../hooks/useHashRoute.js";
import { ConfirmDialog } from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { isImage } from "../lib/format.js";
import { daysLeft, trashEntries, TRASH_DAYS } from "../lib/trash.js";

const title = (kind, item) => (kind === "note" ? item.title || "Untitled" : item.name);

export function Trash({ data, actions }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(null); // { kind, item } | "all"
  const entries = trashEntries(data);

  const iconFor = ({ kind, item }) => {
    if (kind === "folder") return { Icon: Folder, color: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" };
    if (kind === "note") return { Icon: StickyNote, color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300" };
    return isImage(item.type)
      ? { Icon: ImageIcon, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" }
      : { Icon: FileText, color: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300" };
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2 sm:px-4">
          <button type="button" onClick={() => goBack("settings")} className="icon-btn" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-lg font-bold text-slate-900 dark:text-white">Trash</h1>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirm("all")}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              Empty Trash
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-16 sm:px-6">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/60 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Trash2 className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">Trash is empty</h2>
            <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              Deleted items stay here for {TRASH_DAYS} days, so you can bring them back.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 px-1 text-xs text-slate-500 dark:text-slate-400">
              Items are deleted forever after {TRASH_DAYS} days.
            </p>
            <ul className="space-y-2">
              {entries.map((entry) => {
                const { kind, item } = entry;
                const { Icon, color } = iconFor(entry);
                const left = daysLeft(item.deletedAt);
                return (
                  <li
                    key={`${kind}-${item.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {title(kind, item)}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {left <= 1 ? "Deleted tomorrow" : `${left} days left`}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        actions.restoreItem(kind, item.id);
                        toast("Restored");
                      }}
                      className="icon-btn text-indigo-600 dark:text-indigo-400"
                      aria-label={`Restore ${title(kind, item)}`}
                      title="Restore"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm(entry)}
                      className="icon-btn text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                      aria-label={`Delete ${title(kind, item)} forever`}
                      title="Delete forever"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === "all" ? "Empty the Trash?" : "Delete forever?"}
        message={
          confirm === "all"
            ? "Everything in the Trash will be permanently deleted. This can't be undone."
            : confirm
              ? `"${title(confirm.kind, confirm.item)}"${confirm.kind === "folder" ? " and everything inside it" : ""} will be permanently deleted. This can't be undone.`
              : ""
        }
        confirmLabel={confirm === "all" ? "Empty Trash" : "Delete forever"}
        onConfirm={() => (confirm === "all" ? actions.emptyTrash() : actions.deleteForever(confirm.kind, confirm.item.id))}
      />
    </div>
  );
}
