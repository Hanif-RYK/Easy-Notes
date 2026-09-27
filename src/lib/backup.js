import { mergeDuplicateFolders, placeInFolders } from "./folders.js";

// A backup is one JSON file with all folders, notes and documents.
// Document files are embedded as base64 "data:" URLs so a single file is
// enough to restore everything on any device.

const APP = "easy-notes";
const VERSION = 1;
const isString = (v) => typeof v === "string";
const isTime = (v) => typeof v === "number" && Number.isFinite(v);
const isAllowedType = (t) => t === "application/pdf" || (isString(t) && t.startsWith("image/"));

/** Converts a file to a base64 "data:" URL, in chunks so large files don't overflow. */
async function blobToDataUrl(blob, type) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return `data:${type};base64,${btoa(binary)}`;
}

/**
 * Builds the backup file. Documents are added one at a time so even large
 * backups don't need one giant string in memory.
 */
export async function createBackup(data, getFile) {
  const header = JSON.stringify({ app: APP, version: VERSION, exportedAt: Date.now(), folders: data.folders, notes: data.notes });
  const parts = [header.slice(0, -1), ',"docs":['];
  let first = true;
  let missing = 0;

  for (const doc of data.docs) {
    const blob = await getFile(doc.id).catch(() => null);
    if (!blob) {
      missing += 1;
      continue;
    }
    parts.push(first ? "" : ",", JSON.stringify({ ...doc, data: await blobToDataUrl(blob, doc.type) }));
    first = false;
  }
  parts.push("]}");
  return { blob: new Blob(parts, { type: "application/json" }), missing };
}

export function backupFileName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `easy-notes-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/** Reads and checks a backup file. Throws a readable error if it isn't valid. */
export function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file isn't an Easy Notes backup.");
  }
  if (!raw || raw.app !== APP || !Array.isArray(raw.notes) || !Array.isArray(raw.folders) || !Array.isArray(raw.docs)) {
    throw new Error("This file isn't an Easy Notes backup.");
  }
  if (raw.version > VERSION) throw new Error("This backup was made by a newer version of Easy Notes.");

  const optionalTime = (v) => (isTime(v) ? v : undefined);

  const folders = raw.folders
    .filter((f) => f && isString(f.id) && isString(f.name))
    .map((f) => ({
      id: f.id,
      name: f.name.slice(0, 120),
      parentId: isString(f.parentId) ? f.parentId : null,
      createdAt: isTime(f.createdAt) ? f.createdAt : Date.now(),
      deletedAt: optionalTime(f.deletedAt),
    }));

  const notes = raw.notes
    .filter((n) => n && isString(n.id) && isString(n.title) && isString(n.body))
    .map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      pinned: n.pinned === true,
      folderId: isString(n.folderId) ? n.folderId : null,
      createdAt: isTime(n.createdAt) ? n.createdAt : Date.now(),
      updatedAt: isTime(n.updatedAt) ? n.updatedAt : Date.now(),
      deletedAt: optionalTime(n.deletedAt),
    }));

  const docs = raw.docs
    .filter((d) => d && isString(d.id) && isString(d.name) && isAllowedType(d.type) && isString(d.data))
    .filter((d) => d.data.startsWith(`data:${d.type};base64,`))
    .map((d) => ({
      id: d.id,
      name: d.name.slice(0, 200),
      type: d.type,
      size: isTime(d.size) ? d.size : 0,
      pinned: d.pinned === true,
      folderId: isString(d.folderId) ? d.folderId : null,
      createdAt: isTime(d.createdAt) ? d.createdAt : Date.now(),
      deletedAt: optionalTime(d.deletedAt),
      data: d.data,
    }));

  // Drop undefined deletedAt so records stay clean.
  const clean = (r) => (r.deletedAt === undefined ? (({ deletedAt: _d, ...rest }) => rest)(r) : r);
  return { folders: folders.map(clean), notes: notes.map(clean), docs: docs.map(clean) };
}

/**
 * Combines current data with a backup. Items from the backup are added;
 * items that exist in both are replaced by the backup's version.
 */
export function mergeBackup(current, backup, createId) {
  const merge = (a, b) => {
    const map = new Map(a.map((r) => [r.id, r]));
    for (const r of b) map.set(r.id, r);
    return [...map.values()];
  };
  const docsMeta = backup.docs.map(({ data: _data, ...meta }) => meta);
  let data = mergeDuplicateFolders({
    folders: merge(current.folders, backup.folders),
    notes: merge(current.notes, backup.notes),
    docs: merge(current.docs, docsMeta),
  });
  const notes = placeInFolders(data.notes, data.folders, "My Notes", createId);
  const docs = placeInFolders(data.docs, notes.folders, "My Documents", createId);
  data = { notes: notes.items, docs: docs.items, folders: docs.folders };
  return data;
}

export async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}
