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
