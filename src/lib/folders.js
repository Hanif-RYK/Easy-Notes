// Helpers for nested folders. A folder is { id, name, parentId, createdAt },
// where parentId is null for top-level folders. Folders are shared by notes
// and documents; both point to their folder with `folderId`.

/** Folder and all of its sub-folders' ids (at any depth). */
export function descendantIds(folders, folderId) {
  const ids = new Set([folderId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        added = true;
      }
    }
  }
  return ids;
}

/** List of folders from the top level down to `folderId`. */
export function folderPath(folders, folderId) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path = [];
  let current = byId.get(folderId);
  while (current && path.length < 100) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : null;
  }
  return path;
}

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/** Folders as a flat, depth-first list with their nesting depth. */
export function folderTree(folders) {
  const sorted = [...folders].sort(byName);
  const result = [];
  const walk = (parentId, depth) => {
    for (const f of sorted) {
      if ((f.parentId ?? null) === parentId) {
        result.push({ folder: f, depth });
        walk(f.id, depth + 1);
      }
    }
  };
  walk(null, 0);
  return result;
}

/**
 * Notes and documents must live inside a folder. Items that are at the top
 * level or whose folder no longer exists are moved into a default folder,
 * which is created only when needed.
 */
export function placeInFolders(items, folders, defaultName, createId) {
  const known = new Set(folders.map((f) => f.id));
  if (items.every((i) => known.has(i.folderId))) return { items, folders };

  let target = folders.find((f) => !f.parentId && !f.deletedAt && f.name === defaultName);
  const nextFolders = target
    ? folders
    : [...folders, (target = { id: createId(), name: defaultName, parentId: null, createdAt: Date.now() })];

  return {
    items: items.map((i) => (known.has(i.folderId) ? i : { ...i, folderId: target.id })),
    folders: nextFolders,
  };
}

/**
 * Older versions kept separate folders for notes and documents. Now folders
 * are shared, so folders with the same name in the same place are merged
 * (e.g. "Work" for notes and "Work" for documents become one "Work").
 */
export function mergeDuplicateFolders({ notes, docs, folders }) {
  const keep = new Map(); // "parentId/name" -> kept folder id
  const remap = new Map(); // removed folder id -> kept folder id
  const result = [];

  // Handle parents before children so merged parents are already remapped.
  for (const { folder } of folderTree(folders)) {
    const parentId = folder.parentId ? (remap.get(folder.parentId) ?? folder.parentId) : null;
    const key = `${parentId}/${folder.name.trim().toLowerCase()}`;
    const { kind: _kind, ...rest } = folder;
    if (keep.has(key) && !folder.deletedAt) {
      remap.set(folder.id, keep.get(key));
    } else {
      if (!folder.deletedAt) keep.set(key, folder.id);
      result.push({ ...rest, parentId });
    }
  }
  // Keep folders the tree walk could not reach (broken parent links) at the top level.
  const seen = new Set([...result.map((f) => f.id), ...remap.keys()]);
  for (const f of folders) {
    if (!seen.has(f.id)) {
      const { kind: _kind, ...rest } = f;
      result.push({ ...rest, parentId: null });
    }
  }

  const fix = (item) => (remap.has(item.folderId) ? { ...item, folderId: remap.get(item.folderId) } : item);
  return { notes: notes.map(fix), docs: docs.map(fix), folders: result };
}
