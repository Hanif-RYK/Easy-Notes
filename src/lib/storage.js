import { clearFiles, clearRecords, deleteFile, loadAll, writeChanges } from "./db.js";
import { mergeDuplicateFolders, placeInFolders } from "./folders.js";
import { applyJournal, clearJournal, diff } from "./persistence.js";
import { purgeTrash } from "./trash.js";

// Small settings stay in localStorage; notes, documents and folders live in
// IndexedDB (see db.js). Every localStorage access is wrapped in try/catch
// because storage can be unavailable (private mode, blocked cookies) or full.

const KEYS = {
  profile: "easy_notes_profile",
  theme: "easy_notes_theme",
  lastBackup: "easy_notes_last_backup",
  // Used by older versions, migrated to IndexedDB on first start.
  legacyNotes: "easy_notes_notes",
  legacyDocs: "easy_notes_docs",
  legacyFolders: "easy_notes_folders",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const loadProfile = () => read(KEYS.profile, null);
export const saveProfile = (profile) => write(KEYS.profile, profile);

export const loadLastBackup = () => read(KEYS.lastBackup, null);
export const saveLastBackup = (time) => write(KEYS.lastBackup, time);

export function loadTheme() {
  try {
    const saved = localStorage.getItem(KEYS.theme);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // ignore
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(KEYS.theme, theme); // raw string, read by index.html before first paint
  } catch {
    // ignore
  }
}

const asArray = (value) => (Array.isArray(value) ? value : []);

/**
 * Loads all data and brings it up to date:
 * - moves data from older localStorage versions into IndexedDB
 * - re-applies writes that did not finish last time (journal)
 * - merges the old separate note/document folders into shared folders
 * - puts notes/documents without a folder into a default folder
 * - permanently removes items that have been in the Trash for 30 days
 */
export async function loadData() {
  const stored = await loadAll();
  let data = stored;

  const legacy = {
    notes: asArray(read(KEYS.legacyNotes, [])),
    docs: asArray(read(KEYS.legacyDocs, [])),
    folders: asArray(read(KEYS.legacyFolders, [])),
  };
  const hasLegacy = legacy.notes.length || legacy.docs.length || legacy.folders.length;
  const storedIsEmpty = !stored.notes.length && !stored.docs.length && !stored.folders.length;
  if (hasLegacy && storedIsEmpty) data = legacy;

  data = applyJournal(data).data;
  data = mergeDuplicateFolders(data);

  const notes = placeInFolders(data.notes, data.folders, "My Notes", createId);
  const docs = placeInFolders(data.docs, notes.folders, "My Documents", createId);
  data = { notes: notes.items, docs: docs.items, folders: docs.folders };

  const purged = purgeTrash(data, { onlyExpired: true });
  data = purged.data;

  const changes = diff(stored, data);
  if (changes) await writeChanges(changes);
  await Promise.all(purged.fileIds.map((id) => deleteFile(id).catch(() => {})));

  // Everything is safely in IndexedDB now.
  clearJournal();
  remove(KEYS.legacyNotes);
  remove(KEYS.legacyDocs);
  remove(KEYS.legacyFolders);

  return data;
}

export async function clearAppData() {
  clearJournal();
  for (const key of [KEYS.profile, KEYS.lastBackup, KEYS.legacyNotes, KEYS.legacyDocs, KEYS.legacyFolders]) {
    remove(key);
  }
  await Promise.all([clearRecords(), clearFiles()]);
}

/** Asks the browser not to delete our data when space runs low. */
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function storageStatus() {
  try {
    const [estimate, persisted] = await Promise.all([
      navigator.storage?.estimate?.() ?? {},
      navigator.storage?.persisted?.() ?? false,
    ]);
    return { usage: estimate.usage ?? null, persisted };
  } catch {
    return { usage: null, persisted: false };
  }
}
