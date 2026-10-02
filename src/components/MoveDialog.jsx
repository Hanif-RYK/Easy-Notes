import { Check, Folder, Home as HomeIcon } from "lucide-react";
import { Modal } from "./Modal.jsx";
import { descendantIds, folderTree } from "../lib/folders.js";

/**
 * Lets the user pick a destination folder. `target` is { kind, item } where
 * kind is "note", "doc" or "folder". A folder can't be moved into itself or
 * into one of its own sub-folders, so those are hidden.
 */
export function MoveDialog({ target, folders, onClose, onMove }) {
  if (!target) return <Modal open={false} onClose={onClose} />;

  const { kind, item } = target;
  const current = kind === "folder" ? (item.parentId ?? null) : (item.folderId ?? null);
  const blocked = kind === "folder" ? descendantIds(folders, item.id) : new Set();
  const options = folderTree(folders).filter(({ folder }) => !blocked.has(folder.id));

  const choose = (folderId) => {
    onClose();
    if (folderId !== current) onMove(folderId);
  };

  const rowClass =
    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <Modal open onClose={onClose} title={`Move "${item.name ?? item.title ?? "Untitled"}"`}>
      <div className="-mx-2 flex flex-col">
        {/* Only folders can sit at the top level; notes and documents always live in a folder. */}
        {kind === "folder" && (
          <button type="button" onClick={() => choose(null)} className={rowClass}>
            <HomeIcon className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
            <span className="flex-1">Top level</span>
            {current === null && <Check className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
          </button>
        )}
        {options.map(({ folder, depth }) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => choose(folder.id)}
            className={rowClass}
            style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
          >
            <Folder className="h-5 w-5 shrink-0 fill-amber-200 text-amber-600 dark:fill-amber-500/30" />
            <span className="min-w-0 flex-1 truncate">{folder.name}</span>
            {current === folder.id && <Check className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
          </button>
        ))}
        {options.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
            No other folders yet. Create one with the New folder button.
          </p>
        )}
      </div>
    </Modal>
  );
}
