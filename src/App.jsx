import { useCallback, useEffect, useMemo, useState } from "react";
import { navigate, useHashRoute } from "./hooks/useHashRoute.js";
import { useToast } from "./components/Toast.jsx";
import { clearFiles, deleteFile, putFile } from "./lib/fileStore.js";
import {
  clearAppData,
  createId,
  loadDocs,
  loadNotes,
  loadProfile,
  loadTheme,
  saveDocs,
  saveNotes,
  saveProfile,
  saveTheme,
} from "./lib/storage.js";
import { Welcome } from "./screens/Welcome.jsx";
import { Home } from "./screens/Home.jsx";
import { NoteEditor } from "./screens/NoteEditor.jsx";
import { DocViewer } from "./screens/DocViewer.jsx";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const isAllowedFile = (file) => file.type === "application/pdf" || file.type.startsWith("image/");

export default function App() {
  const toast = useToast();
  const route = useHashRoute();

  const [profile, setProfile] = useState(loadProfile);
  const [notes, setNotes] = useState(loadNotes);
  const [docs, setDocs] = useState(loadDocs);
  const [theme, setTheme] = useState(loadTheme);

  // ---- Persistence -------------------------------------------------------
  useEffect(() => {
    if (profile && !saveNotes(notes)) toast("Couldn't save — device storage is full");
  }, [notes, profile, toast]);

  useEffect(() => {
    if (profile) saveDocs(docs);
  }, [docs, profile]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    saveTheme(theme);
  }, [theme]);

  // ---- Notes -------------------------------------------------------------
  const saveNote = useCallback(({ id, title, body }) => {
    setNotes((prev) => {
      const existing = prev.find((n) => n.id === id);
      const isEmpty = !title.trim() && !body.trim();

      if (!existing) {
        if (isEmpty) return prev; // never store a blank note
        const now = Date.now();
        return [{ id, title, body, pinned: false, createdAt: now, updatedAt: now }, ...prev];
      }
      if (existing.title === title && existing.body === body) return prev;
      return prev.map((n) => (n.id === id ? { ...n, title, body, updatedAt: Date.now() } : n));
    });
  }, []);

  const removeNote = useCallback((id) => setNotes((prev) => prev.filter((n) => n.id !== id)), []);

  /** Called when leaving the editor: store the last changes, drop empty notes. */
  const closeNote = useCallback(
    (draft) => {
      if (!draft.title.trim() && !draft.body.trim()) removeNote(draft.id);
      else saveNote(draft);
    },
    [removeNote, saveNote],
  );

  // ---- Documents ---------------------------------------------------------
  const addFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      let added = 0;

      for (const file of files) {
        if (!isAllowedFile(file)) {
          toast(`${file.name}: only PDFs and images are supported`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast(`${file.name} is larger than 25 MB`);
          continue;
        }
        const id = createId();
        try {
          await putFile(id, file);
        } catch {
          toast("Couldn't save the file — storage may be full");
          continue;
        }
        const doc = { id, name: file.name, type: file.type, size: file.size, pinned: false, createdAt: Date.now() };
        setDocs((prev) => [doc, ...prev]);
        added += 1;
      }

      if (added > 0) toast(added === 1 ? "Document added" : `${added} documents added`);
    },
    [toast],
  );

  const renameDoc = useCallback((id, name) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
  }, []);

  const removeDoc = useCallback((id) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    deleteFile(id).catch(() => {});
  }, []);

  // ---- Shared ------------------------------------------------------------
  const togglePin = useCallback((kind, id) => {
    const update = (list) => list.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item));
    if (kind === "note") setNotes(update);
    else setDocs(update);
  }, []);

  const startApp = useCallback((name) => {
    const next = { name };
    saveProfile(next);
    setProfile(next);
    navigate("notes", { replace: true });
  }, []);

  const renameProfile = useCallback((name) => {
    const next = { name };
    saveProfile(next);
    setProfile(next);
  }, []);

  const resetApp = useCallback(async () => {
    clearAppData();
    await clearFiles().catch(() => {});
    setNotes(loadNotes());
    setDocs([]);
    setProfile(null);
    navigate("", { replace: true });
  }, []);

  const actions = useMemo(
    () => ({
      saveNote,
      closeNote,
      removeNote,
      addFiles,
      renameDoc,
      removeDoc,
      togglePin,
      renameProfile,
      resetApp,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    }),
    [saveNote, closeNote, removeNote, addFiles, renameDoc, removeDoc, togglePin, renameProfile, resetApp],
  );

  // ---- Routing -----------------------------------------------------------
  if (!profile) return <Welcome onStart={startApp} />;

  const [page, id] = route;

  if (page === "note" && id) {
    const note = notes.find((n) => n.id === id);
    return <NoteEditor key={id} id={id} note={note} actions={actions} />;
  }

  if (page === "doc" && id) {
    const doc = docs.find((d) => d.id === id);
    return <DocViewer key={id} doc={doc} actions={actions} />;
  }

  return (
    <Home
      tab={page === "docs" ? "docs" : "notes"}
      notes={notes}
      docs={docs}
      profile={profile}
      theme={theme}
      actions={actions}
    />
  );
}
