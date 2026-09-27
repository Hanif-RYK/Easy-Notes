import { descendantIds } from "./folders.js";

// Deleting moves things to the Trash by setting `deletedAt`. A trashed folder
// hides everything inside it. Items stay in the Trash for 30 days.

export const TRASH_DAYS = 30;
const DAY = 86_400_000;

/** Ids of trashed folders and every folder inside them. */
export function hiddenFolderIds(folders) {
  const hidden = new Set();
  for (const f of folders) {
    if (f.deletedAt) for (const id of descendantIds(folders, f.id)) hidden.add(id);
  }
  return hidden;
}

/** Only what should be visible in the app (nothing trashed, nothing inside a trashed folder). */
export function liveData({ notes, docs, folders }) {
  const hidden = hiddenFolderIds(folders);
  return {
    notes: notes.filter((n) => !n.deletedAt && !hidden.has(n.folderId)),
    docs: docs.filter((d) => !d.deletedAt && !hidden.has(d.folderId)),
    folders: folders.filter((f) => !hidden.has(f.id)),
  };
}

/** Everything shown in the Trash screen (top-level trashed entries only). */
export function trashEntries({ notes, docs, folders }) {
  const entries = [
    ...folders.filter((f) => f.deletedAt).map((item) => ({ kind: "folder", item })),
    ...notes.filter((n) => n.deletedAt).map((item) => ({ kind: "note", item })),
    ...docs.filter((d) => d.deletedAt).map((item) => ({ kind: "doc", item })),
  ];
  return entries.sort((a, b) => b.item.deletedAt - a.item.deletedAt);
}

export function daysLeft(deletedAt, now = Date.now()) {
  return Math.max(0, Math.ceil((deletedAt + TRASH_DAYS * DAY - now) / DAY));
}

const collection = { note: "notes", doc: "docs", folder: "folders" };

/** Marks an item as deleted (moves it to the Trash). */
export function moveToTrash(data, kind, id, now = Date.now()) {
  const key = collection[kind];
  return { ...data, [key]: data[key].map((i) => (i.id === id ? { ...i, deletedAt: now } : i)) };
}

/** Takes an item out of the Trash. */
export function restore(data, kind, id) {
  const key = collection[kind];
  return {
    ...data,
    [key]: data[key].map((i) => {
      if (i.id !== id) return i;
      const { deletedAt: _deletedAt, ...rest } = i;
      return rest;
    }),
  };
}

/**
 * Permanently removes an item (and for a folder, everything inside it).
 * Returns the new data and the ids of documents whose files must be deleted.
 */
export function removeForever(data, kind, id) {
  if (kind !== "folder") {
    const key = collection[kind];
    return { data: { ...data, [key]: data[key].filter((i) => i.id !== id) }, fileIds: kind === "doc" ? [id] : [] };
  }
  const ids = descendantIds(data.folders, id);
  const fileIds = data.docs.filter((d) => ids.has(d.folderId)).map((d) => d.id);
  return {
    data: {
      folders: data.folders.filter((f) => !ids.has(f.id)),
      notes: data.notes.filter((n) => !ids.has(n.folderId)),
      docs: data.docs.filter((d) => !ids.has(d.folderId)),
    },
    fileIds,
  };
}

/** Permanently removes everything in the Trash, or only what is older than 30 days. */
export function purgeTrash(data, { onlyExpired = false, now = Date.now() } = {}) {
  const expired = (i) => i.deletedAt && (!onlyExpired || now - i.deletedAt >= TRASH_DAYS * DAY);
  let result = { data, fileIds: [] };
  for (const f of data.folders.filter(expired)) {
    const next = removeForever(result.data, "folder", f.id);
    result = { data: next.data, fileIds: [...result.fileIds, ...next.fileIds] };
  }
  const docsGone = result.data.docs.filter(expired).map((d) => d.id);
  return {
    data: {
      folders: result.data.folders,
      notes: result.data.notes.filter((n) => !expired(n)),
      docs: result.data.docs.filter((d) => !expired(d)),
    },
    fileIds: [...result.fileIds, ...docsGone],
  };
}
