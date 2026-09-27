// Helpers for nested folders. A folder is { id, name, kind, parentId }, where
// kind is "note" or "doc" and parentId is null for top-level folders.
// Notes and documents point to their folder with `folderId` (null = top level).

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

/** Folders of one kind as a flat, depth-first list with their nesting depth. */
export function folderTree(folders, kind) {
  const ofKind = folders
    .filter((f) => f.kind === kind)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const result = [];
  const walk = (parentId, depth) => {
    for (const f of ofKind) {
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
 * level (older data) or whose folder no longer exists are moved into a
 * default folder, which is created only when needed.
 */
export function placeInFolders(items, folders, kind, defaultName, createId) {
  const known = new Set(folders.filter((f) => f.kind === kind).map((f) => f.id));
  if (items.every((i) => known.has(i.folderId))) return { items, folders };

  let target = folders.find((f) => f.kind === kind && f.parentId === null && f.name === defaultName);
  const nextFolders = target
    ? folders
    : [...folders, (target = { id: createId(), name: defaultName, kind, parentId: null, createdAt: Date.now() })];

  return {
    items: items.map((i) => (known.has(i.folderId) ? i : { ...i, folderId: target.id })),
    folders: nextFolders,
  };
}
