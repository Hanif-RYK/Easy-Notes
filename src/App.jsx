import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { navigate, useHashRoute } from "./hooks/useHashRoute.js";
import { useToast } from "./components/Toast.jsx";
import { backupFileName, createBackup, dataUrlToBlob, mergeBackup, parseBackup } from "./lib/backup.js";
import { deleteFile, getFile, putFile, setBlockedHandler } from "./lib/db.js";
import { descendantIds, placeInFolders } from "./lib/folders.js";
import { createSaver } from "./lib/persistence.js";
import {
  createId,
  loadData,
  loadLastBackup,
  loadProfile,
  loadTheme,
  requestPersistentStorage,
  saveLastBackup,
  saveProfile,
  saveTheme,
} from "./lib/storage.js";
import {
  hiddenFolderIds,
  liveData,
  moveToTrash,
  purgeTrash,
  removeForever,
  restore,
  trashEntries,
} from "./lib/trash.js";
import { LoadingScreen } from "./screens/LoadingScreen.jsx";
import { Welcome } from "./screens/Welcome.jsx";
import { Home } from "./screens/Home.jsx";
import { NoteEditor } from "./screens/NoteEditor.jsx";
import { DocViewer } from "./screens/DocViewer.jsx";
import { Settings } from "./screens/Settings.jsx";
import { Trash } from "./screens/Trash.jsx";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const SAVE_DELAY = 600;
const isAllowedFile = (file) => file.type === "application/pdf" || file.type.startsWith("image/");

/** Adds or updates a note from the editor. Blank new notes are never stored. */
function upsertNote(data, { id, title, body }, folderId) {
  const existing = data.notes.find((n) => n.id === id);
  if (!existing) {
    if (!title.trim() && !body.trim()) return data;
    const now = Date.now();
    const note = { id, title, body, pinned: false, folderId: folderId ?? null, createdAt: now, updatedAt: now };
    return { ...data, notes: [note, ...data.notes] };
  }
  if (existing.title === title && existing.body === body) return data;
  return {
    ...data,
    notes: data.notes.map((n) => (n.id === id ? { ...n, title, body, updatedAt: Date.now() } : n)),
  };
}

export default function App() {
  const toast = useToast();
  const route = useHashRoute();

  const [profile, setProfile] = useState(loadProfile);
  const [theme, setTheme] = useState(loadTheme);
  const [lastBackup, setLastBackup] = useState(loadLastBackup);
  const [data, setData] = useState(null); // { notes, docs, folders } incl. trashed items
  const [loadState, setLoadState] = useState("loading"); // loading | slow | blocked | error

  const saver = useRef(null);
  const dataRef = useRef(data);
  useLayoutEffect(() => {
    dataRef.current = data;
  }, [data]);
  // Folder a brand-new (not yet saved) note should be created in, by note id.
  const newNoteFolders = useRef(new Map());
  // Returns the open note's unsaved text, so it can be saved if the app closes.
  const draftGetter = useRef(null);

  // ---- Loading & saving --------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    // Explain what's happening instead of showing a spinner forever.
    setBlockedHandler(() => !cancelled && setLoadState("blocked"));
    const slowTimer = setTimeout(() => !cancelled && setLoadState((s) => (s === "loading" ? "slow" : s)), 10_000);
    loadData()
      .then((loaded) => {
        if (cancelled) return;
        saver.current = createSaver(loaded, {
          onError: () => toast("Couldn't save — device storage may be full"),
        });
        setData(loaded);
      })
      .catch(() => !cancelled && setLoadState("error"))
      .finally(() => clearTimeout(slowTimer));
    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [toast]);

  // Save changes shortly after they happen (only changed records are written).
  useEffect(() => {
    if (!data || !saver.current) return;
    saver.current.update(data);
    const timer = setTimeout(() => saver.current.flush(), SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [data]);

  // Save immediately when the app is closed or sent to the background,
  // including text still being typed in the note editor.
  useEffect(() => {
    const flush = () => {
      if (!saver.current || !dataRef.current) return;
      const draft = draftGetter.current?.();
      if (draft) saver.current.update(upsertNote(dataRef.current, draft, newNoteFolders.current.get(draft.id)));
      saver.current.flush();
    };
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    saveTheme(theme);
  }, [theme]);

  const live = useMemo(() => (data ? liveData(data) : null), [data]);

  // ---- Notes -------------------------------------------------------------
  const newNote = useCallback((folderId) => {
    const id = createId();
    newNoteFolders.current.set(id, folderId);
    navigate(`note/${id}`);
  }, []);

  const saveNote = useCallback((draft) => {
    setData((prev) => upsertNote(prev, draft, newNoteFolders.current.get(draft.id)));
  }, []);

  /** Called when leaving the editor: store the last changes, drop empty notes. */
  const closeNote = useCallback((draft) => {
    setData((prev) =>
      !draft.title.trim() && !draft.body.trim()
        ? { ...prev, notes: prev.notes.filter((n) => n.id !== draft.id) }
        : upsertNote(prev, draft, newNoteFolders.current.get(draft.id)),
    );
  }, []);

  const registerDraft = useCallback((getter) => {
    draftGetter.current = getter;
    return () => {
      if (draftGetter.current === getter) draftGetter.current = null;
    };
  }, []);

  // ---- Documents ---------------------------------------------------------
  const addFiles = useCallback(
    async (fileList, folderId) => {
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
        const doc = { id, name: file.name, type: file.type, size: file.size, pinned: false, folderId, createdAt: Date.now() };
        setData((prev) => ({ ...prev, docs: [doc, ...prev.docs] }));
        added += 1;
      }

      if (added > 0) toast(added === 1 ? "Document added" : `${added} documents added`);
    },
    [toast],
  );

  const renameDoc = useCallback((id, name) => {
    setData((prev) => ({ ...prev, docs: prev.docs.map((d) => (d.id === id ? { ...d, name } : d)) }));
  }, []);

  // ---- Folders -----------------------------------------------------------
  const createFolder = useCallback(
    (kind, name, parentId = null) => {
      const folder = { id: createId(), name, kind, parentId, createdAt: Date.now() };
      setData((prev) => ({ ...prev, folders: [...prev.folders, folder] }));
      toast("Folder created");
    },
    [toast],
  );

  const renameFolder = useCallback((id, name) => {
    setData((prev) => ({ ...prev, folders: prev.folders.map((f) => (f.id === id ? { ...f, name } : f)) }));
  }, []);

  /** Moves a note, document or folder into `targetId` (null = top level, folders only). */
  const moveItem = useCallback(
    (kind, id, targetId) => {
      setData((prev) => {
        const target = targetId ? prev.folders.find((f) => f.id === targetId) : null;
        if (targetId && !target) return prev;
        if (kind === "folder") {
          // A folder can't be moved into itself or one of its own sub-folders,
          // nor between the Notes and Documents tabs.
          if (targetId && descendantIds(prev.folders, id).has(targetId)) return prev;
          const folder = prev.folders.find((f) => f.id === id);
          if (target && folder && target.kind !== folder.kind) return prev;
          return { ...prev, folders: prev.folders.map((f) => (f.id === id ? { ...f, parentId: targetId } : f)) };
        }
        if (!target || target.kind !== kind) return prev; // notes/documents always live in a folder of their tab
        const key = kind === "note" ? "notes" : "docs";
        return { ...prev, [key]: prev[key].map((i) => (i.id === id ? { ...i, folderId: targetId } : i)) };
      });
      toast("Moved");
    },
    [toast],
  );

  // ---- Trash -------------------------------------------------------------
  const restoreItem = useCallback((kind, id) => {
    setData((prev) => {
      let next = restore(prev, kind, id);
      const hidden = hiddenFolderIds(next.folders);

      if (kind === "folder") {
        // If its parent is still in the Trash, bring it back at the top level.
        return {
          ...next,
          folders: next.folders.map((f) =>
            f.id === id && f.parentId && hidden.has(f.parentId) ? { ...f, parentId: null } : f,
          ),
        };
      }

      // If its folder is gone or still in the Trash, put it in a default folder.
      const key = kind === "note" ? "notes" : "docs";
      const item = next[key].find((i) => i.id === id);
      const folderOk =
        item && !hidden.has(item.folderId) && next.folders.some((f) => f.id === item.folderId && f.kind === kind);
      if (!item || folderOk) return next;

      const visible = next.folders.filter((f) => !hidden.has(f.id));
      const placed = placeInFolders(
        [{ ...item, folderId: null }],
        visible,
        kind,
        kind === "note" ? "My Notes" : "My Documents",
        createId,
      );
      const created = placed.folders.filter((f) => !visible.includes(f));
      return {
        ...next,
        folders: [...next.folders, ...created],
        [key]: next[key].map((i) => (i.id === id ? placed.items[0] : i)),
      };
    });
  }, []);

  const trashItem = useCallback(
    (kind, id) => {
      setData((prev) => moveToTrash(prev, kind, id));
      toast("Moved to Trash", { label: "Undo", onClick: () => restoreItem(kind, id) });
    },
    [toast, restoreItem],
  );

  const deleteForever = useCallback((kind, id) => {
    const { data: next, fileIds } = removeForever(dataRef.current, kind, id);
    setData(next);
    for (const fileId of fileIds) deleteFile(fileId).catch(() => {});
  }, []);

  const emptyTrash = useCallback(() => {
    const { data: next, fileIds } = purgeTrash(dataRef.current);
    setData(next);
    for (const fileId of fileIds) deleteFile(fileId).catch(() => {});
    toast("Trash emptied");
  }, [toast]);

  // ---- Shared ------------------------------------------------------------
  const togglePin = useCallback((kind, id) => {
    const key = kind === "note" ? "notes" : "docs";
    setData((prev) => ({ ...prev, [key]: prev[key].map((i) => (i.id === id ? { ...i, pinned: !i.pinned } : i)) }));
  }, []);

  const startApp = useCallback(() => {
    const next = { startedAt: Date.now() };
    saveProfile(next);
    setProfile(next);
    requestPersistentStorage();
    navigate("notes", { replace: true });
  }, []);

  const exportBackup = useCallback(async () => {
    try {
      const { blob, missing } = await createBackup(dataRef.current, getFile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupFileName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      const now = Date.now();
      saveLastBackup(now);
      setLastBackup(now);
      toast(missing ? `Backup saved (${missing} missing file${missing > 1 ? "s" : ""} skipped)` : "Backup saved");
    } catch {
      toast("Couldn't create the backup");
    }
  }, [toast]);

  /** Reads a backup file and returns a summary plus a function that restores it. */
  const readBackup = useCallback(
    async (file) => {
      const backup = parseBackup(await file.text());
      return {
        summary: { folders: backup.folders.length, notes: backup.notes.length, docs: backup.docs.length },
        apply: async () => {
          let failed = 0;
          for (const doc of backup.docs) {
            try {
              await putFile(doc.id, await dataUrlToBlob(doc.data));
            } catch {
              failed += 1;
            }
          }
          setData((prev) => mergeBackup(prev, backup, createId));
          toast(failed ? `Restored, but ${failed} file${failed > 1 ? "s" : ""} couldn't be saved` : "Backup restored");
        },
      };
    },
    [toast],
  );

  const actions = useMemo(
    () => ({
      newNote,
      saveNote,
      closeNote,
      registerDraft,
      addFiles,
      renameDoc,
      createFolder,
      renameFolder,
      moveItem,
      trashItem,
      restoreItem,
      deleteForever,
      emptyTrash,
      togglePin,
      exportBackup,
      readBackup,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    }),
    [
      newNote,
      saveNote,
      closeNote,
      registerDraft,
      addFiles,
      renameDoc,
      createFolder,
      renameFolder,
      moveItem,
      trashItem,
      restoreItem,
      deleteForever,
      emptyTrash,
      togglePin,
      exportBackup,
      readBackup,
    ],
  );

  // ---- Routing -----------------------------------------------------------
  if (!live) return <LoadingScreen state={loadState} />;

  if (!profile) return <Welcome onStart={startApp} />;

  const [page, id] = route;

  if (page === "note" && id) {
    const note = live.notes.find((n) => n.id === id);
    const gone = !note && data.notes.some((n) => n.id === id); // it is in the Trash
    return <NoteEditor key={id} id={id} note={note} gone={gone} actions={actions} />;
  }

  if (page === "doc" && id) {
    return <DocViewer key={id} doc={live.docs.find((d) => d.id === id)} actions={actions} />;
  }

  const trashCount = trashEntries(data).length;

  if (page === "settings") {
    return <Settings data={live} trashCount={trashCount} theme={theme} lastBackup={lastBackup} actions={actions} />;
  }

  if (page === "trash") return <Trash data={data} actions={actions} />;

  // "#/notes/<folderId>" or "#/docs/<folderId>" opens a folder.
  const tab = page === "docs" ? "docs" : "notes";
  const folder = live.folders.find((f) => f.id === id && f.kind === (tab === "docs" ? "doc" : "note")) ?? null;

  return (
    <Home
      key={tab}
      tab={tab}
      folder={folder}
      notes={live.notes}
      docs={live.docs}
      folders={live.folders}
      lastBackup={lastBackup}
      actions={actions}
    />
  );
}
