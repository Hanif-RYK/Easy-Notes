// Small helpers around localStorage. Every access is wrapped in try/catch
// because storage can be unavailable (private mode, blocked cookies) or full.

const KEYS = {
  notes: "easy_notes_notes",
  docs: "easy_notes_docs",
  folders: "easy_notes_folders",
  profile: "easy_notes_profile",
  theme: "easy_notes_theme",
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
    return true;
  } catch {
    return false;
  }
}

export function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function welcomeNote() {
  const now = Date.now();
  return {
    id: createId(),
    title: "Welcome to Easy Notes 👋",
    body: [
      "A few tips to get started:",
      "",
      "• Tap + New to write a note or create a folder. Notes save automatically.",
      "• Switch to Documents to keep PDFs and photos in one place.",
      "• Use the ⋯ menu to pin, move to a folder or delete an item.",
      "• Everything stays private on this device.",
    ].join("\n"),
    pinned: false,
    folderId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function loadNotes() {
  const notes = read(KEYS.notes, null);
  return Array.isArray(notes) ? notes : [welcomeNote()];
}

export const saveNotes = (notes) => write(KEYS.notes, notes);

export function loadDocs() {
  const docs = read(KEYS.docs, []);
  return Array.isArray(docs) ? docs : [];
}

export const saveDocs = (docs) => write(KEYS.docs, docs);

export function loadFolders() {
  const folders = read(KEYS.folders, []);
  return Array.isArray(folders) ? folders : [];
}

export const saveFolders = (folders) => write(KEYS.folders, folders);

export const loadProfile = () => read(KEYS.profile, null);
export const saveProfile = (profile) => write(KEYS.profile, profile);

export function loadTheme() {
  try {
    const saved = localStorage.getItem(KEYS.theme);
    if (saved) return saved;
  } catch {
    // ignore
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(KEYS.theme, theme);
  } catch {
    // ignore
  }
}

export function clearAppData() {
  for (const key of [KEYS.notes, KEYS.docs, KEYS.folders, KEYS.profile]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
