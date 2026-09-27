// Helpers for nested folders. A folder is { id, name, kind, parentId, createdAt },
// where kind is "note" or "doc" (Notes and Documents have separate folders)
// and parentId is null for top-level folders. Notes and documents point to
// their folder with `folderId`.

export const KINDS = ["note", "doc"];

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
 * Notes and documents must live inside a folder of their own kind. Items
 * that are at the top level or whose folder is missing (or of the other
 * kind) are moved into a default folder, which is created only when needed.
 */
export function placeInFolders(items, folders, kind, defaultName, createId) {
  const known = new Set(folders.filter((f) => f.kind === kind).map((f) => f.id));
  if (items.every((i) => known.has(i.folderId))) return { items, folders };

  let target = folders.find((f) => f.kind === kind && !f.parentId && !f.deletedAt && f.name === defaultName);
  const nextFolders = target
    ? folders
    : [...folders, (target = { id: createId(), name: defaultName, kind, parentId: null, createdAt: Date.now() })];

  return {
    items: items.map((i) => (known.has(i.folderId) ? i : { ...i, folderId: target.id })),
    folders: nextFolders,
  };
}

/**
 * One version of the app had folders shared by notes and documents (no
 * `kind`). This gives every such folder a kind again:
 * - a folder whose contents (at any depth) are only notes becomes a Notes folder
 * - only documents → a Documents folder
 * - both → split into two copies, one for each tab, each with its own items
 * - empty → same as its parent folder, or both tabs at the top level
 * Folders that already have a kind are left unchanged.
 */
export function splitFoldersByKind(data, createId) {
  const { notes, docs, folders } = data;
  if (folders.every((f) => KINDS.includes(f.kind))) return data;

  const kindsOf = new Map(); // folder id -> Set of kinds it needs
  const contentKinds = (id) => {
    const ids = descendantIds(folders, id);
    const kinds = new Set();
    if (notes.some((n) => ids.has(n.folderId))) kinds.add("note");
    if (docs.some((d) => ids.has(d.folderId))) kinds.add("doc");
    return kinds;
  };

  // Parents first, so empty sub-folders can follow their parent.
  for (const { folder } of folderTree(folders)) {
    if (KINDS.includes(folder.kind)) {
      kindsOf.set(folder.id, new Set([folder.kind]));
      continue;
    }
    const own = contentKinds(folder.id);
    const parentKinds = folder.parentId ? kindsOf.get(folder.parentId) : null;
    kindsOf.set(folder.id, own.size ? own : new Set(parentKinds ?? KINDS));
  }
  // Folders the tree walk could not reach (broken parent links) keep both kinds.
  for (const f of folders) if (!kindsOf.has(f.id)) kindsOf.set(f.id, new Set(KINDS));

  // The Notes copy keeps the original id; a Documents copy gets a new id.
  const docCopyId = new Map();
  for (const f of folders) {
    const kinds = kindsOf.get(f.id);
    if (!KINDS.includes(f.kind) && kinds.has("doc") && kinds.has("note")) docCopyId.set(f.id, createId());
  }
  const idFor = (folderId, kind) => (kind === "doc" && docCopyId.has(folderId) ? docCopyId.get(folderId) : folderId);

  const result = [];
  for (const f of folders) {
    if (KINDS.includes(f.kind)) {
      result.push(f);
      continue;
    }
    for (const kind of KINDS) {
      if (!kindsOf.get(f.id).has(kind)) continue;
      result.push({ ...f, id: idFor(f.id, kind), kind, parentId: f.parentId ? idFor(f.parentId, kind) : null });
    }
  }

  const fixDoc = (d) => (docCopyId.has(d.folderId) ? { ...d, folderId: docCopyId.get(d.folderId) } : d);
  return { notes, docs: docs.map(fixDoc), folders: result };
}
