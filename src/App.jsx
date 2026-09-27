import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { navigate, useHashRoute } from "./hooks/useHashRoute.js";
import { useToast } from "./components/Toast.jsx";
import { clearFiles, deleteFile, putFile } from "./lib/fileStore.js";
import { descendantIds } from "./lib/folders.js";
import {
  clearAppData,
  createId,
  loadDocs,
  loadFolders,
  loadNotes,
  loadProfile,
  loadTheme,
  saveDocs,
  saveFolders,
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
  const [folders, setFolders] = useState(loadFolders);
  const [theme, setTheme] = useState(loadTheme);

  // Folder a brand-new (not yet saved) note should be created in, by note id.
  const newNoteFolders = useRef(new Map());

  // ---- Persistence -------------------------------------------------------
  useEffect(() => {
    if (profile && !saveNotes(notes)) toast("Couldn't save — device storage is full");
  }, [notes, profile, toast]);

  useEffect(() => {
    if (profile) saveDocs(docs);
  }, [docs, profile]);

  useEffect(() => {
    if (profile) saveFolders(folders);
  }, [folders, profile]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    saveTheme(theme);
  }, [theme]);

  // ---- Notes -------------------------------------------------------------
  const newNote = useCallback((folderId = null) => {
    const id = createId();
    newNoteFolders.current.set(id, folderId);
    navigate(`note/${id}`);
  }, []);

  const saveNote = useCallback(({ id, title, body }) => {
    setNotes((prev) => {
      const existing = prev.find((n) => n.id === id);
      const isEmpty = !title.trim() && !body.trim();

      if (!existing) {
        if (isEmpty) return prev; // never store a blank note
        const now = Date.now();
        const folderId = newNoteFolders.current.get(id) ?? null;
        return [{ id, title, body, pinned: false, folderId, createdAt: now, updatedAt: now }, ...prev];
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
    async (fileList, folderId = null) => {
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
        const doc = {
          id,
          name: file.name,
          type: file.type,
          size: file.size,
          pinned: false,
          folderId,
          createdAt: Date.now(),
        };
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

  // ---- Folders -----------------------------------------------------------
  const createFolder = useCallback(
    (kind, name, parentId = null) => {
      setFolders((prev) => [...prev, { id: createId(), name, kind, parentId, createdAt: Date.now() }]);
      toast("Folder created");
    },
    [toast],
  );

  const renameFolder = useCallback((id, name) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }, []);

  /** Deletes a folder together with its sub-folders and everything inside them. */
  const removeFolder = useCallback(
    (id) => {
      const ids = descendantIds(folders, id);
      setFolders((prev) => prev.filter((f) => !ids.has(f.id)));
      setNotes((prev) => prev.filter((n) => !ids.has(n.folderId)));
      setDocs((prev) => {
        for (const d of prev) if (ids.has(d.folderId)) deleteFile(d.id).catch(() => {});
        return prev.filter((d) => !ids.has(d.folderId));
      });
    },
    [folders],
  );

  /** Moves a note, document or folder into `targetId` (null = top level). */
  const moveItem = useCallback(
    (kind, id, targetId) => {
      if (kind === "folder") {
        // A folder can't be moved into itself or one of its own sub-folders.
        if (targetId && descendantIds(folders, id).has(targetId)) return;
        setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, parentId: targetId } : f)));
      } else {
        const update = (list) => list.map((item) => (item.id === id ? { ...item, folderId: targetId } : item));
        if (kind === "note") setNotes(update);
        else setDocs(update);
      }
      toast("Moved");
    },
    [folders, toast],
  );

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
    setFolders([]);
    setProfile(null);
    navigate("", { replace: true });
  }, []);

  const actions = useMemo(
    () => ({
      newNote,
      saveNote,
      closeNote,
      removeNote,
      addFiles,
      renameDoc,
      removeDoc,
      createFolder,
      renameFolder,
      removeFolder,
      moveItem,
      togglePin,
      renameProfile,
      resetApp,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    }),
    [
      newNote,
      saveNote,
      closeNote,
      removeNote,
      addFiles,
      renameDoc,
      removeDoc,
      createFolder,
      renameFolder,
      removeFolder,
      moveItem,
      togglePin,
      renameProfile,
      resetApp,
    ],
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

  // "#/notes/<folderId>" or "#/docs/<folderId>" opens a folder.
  const tab = page === "docs" ? "docs" : "notes";
  const kind = tab === "docs" ? "doc" : "note";
  const folder = folders.find((f) => f.id === id && f.kind === kind) ?? null;

  return (
    <Home
      key={tab}
      tab={tab}
      folder={folder}
      notes={notes}
      docs={docs}
      folders={folders}
      profile={profile}
      theme={theme}
      actions={actions}
    />
  );
}
