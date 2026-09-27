import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Image as ImageIcon,
  Moon,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { goBack, navigate } from "../hooks/useHashRoute.js";
import { ActionSheet, ConfirmDialog, Modal, PromptDialog } from "../components/Modal.jsx";
import { MoveDialog } from "../components/MoveDialog.jsx";
import { descendantIds, folderPath } from "../lib/folders.js";
import { formatDate, formatSize, initials, isImage, isPdf, preview } from "../lib/format.js";

const SORTS = [
  { id: "recent", label: "Most recent" },
  { id: "oldest", label: "Oldest first" },
  { id: "az", label: "Name (A–Z)" },
];

const DOC_FILTERS = [
  { id: "all", label: "All" },
  { id: "pdf", label: "PDFs" },
  { id: "image", label: "Images" },
];

const sectionTitle = "mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400";

function sortItems(items, sort, getTitle, getDate) {
  const list = [...items];
  if (sort === "az") return list.sort((a, b) => getTitle(a).localeCompare(getTitle(b), undefined, { sensitivity: "base" }));
  if (sort === "oldest") return list.sort((a, b) => getDate(a) - getDate(b));
  return list.sort((a, b) => getDate(b) - getDate(a));
}

const itemTitle = (kind, item) => (kind === "note" ? item.title || "Untitled" : item.name);

export function Home({ tab, folder, notes, docs, folders, profile, theme, actions }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [docFilter, setDocFilter] = useState("all");
  const [sheet, setSheet] = useState(null); // "filter" | "new" | "profile" | null
  const [menu, setMenu] = useState(null); // { kind, item } — kind: "note" | "doc" | "folder"
  const [prompt, setPrompt] = useState(null); // { type, item? }
  const [moving, setMoving] = useState(null); // { kind, item }
  const [deleting, setDeleting] = useState(null); // { kind, item } | "all"

  const fileInput = useRef(null);
  const cameraInput = useRef(null);

  const isNotes = tab === "notes";
  const kind = isNotes ? "note" : "doc";
  const folderId = folder?.id ?? null;
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const filtersActive = sort !== "recent" || (!isNotes && docFilter !== "all");

  const tabFolders = useMemo(() => folders.filter((f) => f.kind === kind), [folders, kind]);
  const allItems = isNotes ? notes : docs;
  const folderName = useMemo(() => new Map(tabFolders.map((f) => [f.id, f.name])), [tabFolders]);
  const path = useMemo(() => folderPath(tabFolders, folderId), [tabFolders, folderId]);

  // While searching we look through every folder; otherwise only the open one.
  const visibleFolders = useMemo(() => {
    const list = searching
      ? tabFolders.filter((f) => f.name.toLowerCase().includes(q))
      : tabFolders.filter((f) => (f.parentId ?? null) === folderId);
    return sortItems(list, sort, (f) => f.name, (f) => f.createdAt);
  }, [tabFolders, searching, q, folderId, sort]);

  const visibleItems = useMemo(() => {
    let list = searching
      ? allItems.filter((i) =>
          isNotes
            ? i.title.toLowerCase().includes(q) || i.body.toLowerCase().includes(q)
            : i.name.toLowerCase().includes(q),
        )
      : folderId
        ? allItems.filter((i) => i.folderId === folderId)
        : allItems.filter((i) => i.pinned); // top level: folders, plus pinned items for quick access
    if (!isNotes && docFilter === "pdf") list = list.filter((d) => isPdf(d.type));
    if (!isNotes && docFilter === "image") list = list.filter((d) => isImage(d.type));
    return isNotes
      ? sortItems(list, sort, (n) => n.title || "Untitled", (n) => n.updatedAt)
      : sortItems(list, sort, (d) => d.name, (d) => d.createdAt);
  }, [allItems, isNotes, searching, q, folderId, docFilter, sort]);

  const pinned = visibleItems.filter((i) => i.pinned);
  const others = visibleItems.filter((i) => !i.pinned);

  const countInside = (id) =>
    tabFolders.filter((f) => f.parentId === id).length + allItems.filter((i) => i.folderId === id).length;

  const openFolder = (id) => navigate(id ? `${tab}/${id}` : tab);
  const leaveFolder = () => goBack(folder?.parentId ? `${tab}/${folder.parentId}` : tab);

  const onFilesPicked = (e) => {
    actions.addFiles(e.target.files, folderId);
    e.target.value = ""; // allow picking the same file again
  };

  // ---- Rows --------------------------------------------------------------
  const rowClass =
    "flex items-center rounded-2xl border border-slate-200/70 bg-white transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700";

  const renderFolder = (f) => {
    const count = countInside(f.id);
    return (
      <li key={f.id} className={rowClass}>
        <button
          type="button"
          onClick={() => openFolder(f.id)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3.5 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-300">
            <Folder className="h-5 w-5 fill-current/25" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{f.name}</span>
            <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
              {searching && f.parentId ? `in ${folderName.get(f.parentId)} · ` : ""}
              {count === 0 ? "Empty" : `${count} ${count === 1 ? "item" : "items"}`}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
        </button>
        <button
          type="button"
          onClick={() => setMenu({ kind: "folder", item: f })}
          className="icon-btn mr-2 text-slate-400"
          aria-label={`Options for folder ${f.name}`}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </li>
    );
  };

  const renderItem = (item) => {
    const title = itemTitle(kind, item);
    const Icon = isNotes ? StickyNote : isImage(item.type) ? ImageIcon : FileText;
    const iconColor = isNotes
      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
      : isImage(item.type)
        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
        : "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300";
    const location = (searching || !folder) && item.folderId ? `in ${folderName.get(item.folderId)} · ` : "";

    return (
      <li key={item.id} className={rowClass}>
        <button
          type="button"
          onClick={() => navigate(`${kind}/${item.id}`)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3.5 text-left"
        >
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
              {item.pinned && <Pin className="h-3.5 w-3.5 shrink-0 fill-current text-amber-500" aria-label="Pinned" />}
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
              {location}
              {isNotes
                ? `${formatDate(item.updatedAt)} · ${preview(item.body)}`
                : `${formatDate(item.createdAt)} · ${formatSize(item.size)}`}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMenu({ kind, item })}
          className="icon-btn mr-2 text-slate-400"
          aria-label={`Options for ${title}`}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </li>
    );
  };

  // ---- Menus -------------------------------------------------------------
  const menuActions = !menu
    ? []
    : menu.kind === "folder"
      ? [
          { label: "Open", icon: FolderOpen, onClick: () => openFolder(menu.item.id) },
          { label: "Rename", icon: Pencil, onClick: () => setPrompt({ type: "renameFolder", item: menu.item }) },
          { label: "Move to folder", icon: FolderInput, onClick: () => setMoving(menu) },
          { label: "Delete", icon: Trash2, danger: true, onClick: () => setDeleting(menu) },
        ]
      : [
          {
            label: menu.item.pinned ? "Unpin" : "Pin to top",
            icon: menu.item.pinned ? PinOff : Pin,
            onClick: () => actions.togglePin(menu.kind, menu.item.id),
          },
          menu.kind === "doc"
            ? { label: "Rename", icon: Pencil, onClick: () => setPrompt({ type: "renameDoc", item: menu.item }) }
            : { label: "Edit", icon: Pencil, onClick: () => navigate(`note/${menu.item.id}`) },
          { label: "Move to folder", icon: FolderInput, onClick: () => setMoving(menu) },
          { label: "Delete", icon: Trash2, danger: true, onClick: () => setDeleting(menu) },
        ];

  const newActions = [
    ...(!folder
      ? []
      : isNotes
        ? [{ label: "New note", icon: StickyNote, onClick: () => actions.newNote(folderId) }]
        : [
            { label: "Upload PDF or image", icon: Upload, onClick: () => fileInput.current?.click() },
            { label: "Take a photo", icon: Camera, onClick: () => cameraInput.current?.click() },
          ]),
    {
      label: folder ? `New folder in "${folder.name}"` : "New folder",
      icon: FolderPlus,
      onClick: () => setPrompt({ type: "newFolder" }),
    },
  ];

  const promptConfig = {
    newFolder: { title: "New folder", label: "Folder name", initial: "", submit: "Create" },
    renameFolder: { title: "Rename folder", label: "Folder name", initial: prompt?.item?.name, submit: "Save" },
    renameDoc: { title: "Rename document", label: "Document name", initial: prompt?.item?.name, submit: "Save" },
    profile: { title: "Your name", label: "Name", initial: profile.name, submit: "Save" },
  }[prompt?.type ?? "newFolder"];

  const submitPrompt = (value) => {
    if (prompt.type === "newFolder") actions.createFolder(kind, value, folderId);
    else if (prompt.type === "renameFolder") actions.renameFolder(prompt.item.id, value);
    else if (prompt.type === "renameDoc") actions.renameDoc(prompt.item.id, value);
    else actions.renameProfile(value);
  };

  const deleteMessage = () => {
    if (deleting === "all") return "All notes, documents, folders and settings on this device will be permanently removed.";
    if (!deleting) return "";
    if (deleting.kind !== "folder") return `"${itemTitle(deleting.kind, deleting.item)}" will be permanently deleted.`;
    const ids = descendantIds(folders, deleting.item.id);
    const inside = allItems.filter((i) => ids.has(i.folderId)).length + ids.size - 1;
    return inside > 0
      ? `"${deleting.item.name}" and everything inside it (${inside} ${inside === 1 ? "item" : "items"}) will be permanently deleted.`
      : `"${deleting.item.name}" will be permanently deleted.`;
  };

  const confirmDelete = () => {
    if (deleting === "all") return actions.resetApp();
    const { kind: k, item } = deleting;
    if (k === "folder") {
      // If the open folder is being deleted, go back to where it was.
      const openIsInside = folderId && descendantIds(folders, item.id).has(folderId);
      actions.removeFolder(item.id);
      if (openIsInside) navigate(item.parentId ? `${tab}/${item.parentId}` : tab, { replace: true });
    } else if (k === "doc") actions.removeDoc(item.id);
    else actions.removeNote(item.id);
  };

  const totalPinned = notes.filter((n) => n.pinned).length + docs.filter((d) => d.pinned).length;
  const isEmpty = visibleFolders.length === 0 && visibleItems.length === 0;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto max-w-3xl px-4 pt-4 pb-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Easy Notes</h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSheet("profile")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-95"
                aria-label="Profile and settings"
              >
                {initials(profile.name)}
              </button>
            </div>
          </div>

          {/* Search + filter */}
          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isNotes ? "Search all notes" : "Search all documents"}
                aria-label="Search"
                className="input pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSheet("filter")}
              className={`icon-btn relative h-11 w-11 rounded-xl border ${
                filtersActive
                  ? "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/50 dark:bg-indigo-500/15 dark:text-indigo-300"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
              }`}
              aria-label={filtersActive ? "Filter and sort (active)" : "Filter and sort"}
              title="Filter & sort"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {filtersActive && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white dark:bg-indigo-400 dark:ring-slate-800" />
              )}
            </button>
          </div>

          {/* Tabs */}
          <div role="tablist" className="mt-3 flex rounded-xl bg-slate-200/60 p-1 dark:bg-slate-800/80">
            {[
              { id: "notes", label: "Notes", count: notes.length },
              { id: "docs", label: "Documents", count: docs.length },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => navigate(t.id, { replace: true })}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  tab === t.id
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-xs font-medium text-slate-400">{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-32 sm:px-6">
        {/* Open folder: back button, breadcrumb and folder options */}
        {folder && !searching && (
          <div className="mb-4 flex items-center gap-1">
            <button type="button" onClick={leaveFolder} className="icon-btn -ml-2" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              {/* Parent folders, shown only for sub-folders */}
              {path.length > 1 && (
                <nav aria-label="Folder path" className="flex items-center gap-1 overflow-hidden text-xs text-slate-500 dark:text-slate-400">
                  {path.slice(0, -1).map((p) => (
                    <span key={p.id} className="flex min-w-0 items-center gap-1">
                      <button type="button" onClick={() => openFolder(p.id)} className="truncate hover:text-indigo-600 dark:hover:text-indigo-400">
                        {p.name}
                      </button>
                      <ChevronRight className="h-3 w-3 shrink-0" />
                    </span>
                  ))}
                </nav>
              )}
              <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">{folder.name}</h2>
            </div>
            <button
              type="button"
              onClick={() => setMenu({ kind: "folder", item: folder })}
              className="icon-btn"
              aria-label="Folder options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        )}

        {searching && (
          <p className="mb-3 px-1 text-xs text-slate-500 dark:text-slate-400">
            Results in all {isNotes ? "notes" : "documents"}
          </p>
        )}

        {isEmpty ? (
          <EmptyState
            isNotes={isNotes}
            query={query}
            inFolder={!!folder}
            filtered={!isNotes && docFilter !== "all"}
            onAdd={() => (folder ? setSheet("new") : setPrompt({ type: "newFolder" }))}
          />
        ) : (
          <div className="space-y-6">
            {visibleFolders.length > 0 && (
              <section>
                <h3 className={sectionTitle}>Folders</h3>
                <ul className="space-y-2">{visibleFolders.map(renderFolder)}</ul>
              </section>
            )}
            {pinned.length > 0 && (
              <section>
                <h3 className={sectionTitle}>Pinned</h3>
                <ul className="space-y-2">{pinned.map(renderItem)}</ul>
              </section>
            )}
            {others.length > 0 && (
              <section>
                <ul className="space-y-2">{others.map(renderItem)}</ul>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Floating add button */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl justify-end px-4 sm:px-6">
          <button
            type="button"
            onClick={() => (folder ? setSheet("new") : setPrompt({ type: "newFolder" }))}
            className="btn-primary pointer-events-auto h-14 rounded-full px-6 shadow-lg shadow-indigo-600/30"
          >
            {folder ? <Plus className="h-5 w-5" strokeWidth={2.5} /> : <FolderPlus className="h-5 w-5" />}
            {folder ? "New" : "New folder"}
          </button>
        </div>
      </div>

      <input ref={fileInput} type="file" accept="application/pdf,image/*" multiple hidden onChange={onFilesPicked} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onFilesPicked} />

      {/* Sheets & dialogs */}
      <Modal open={sheet === "filter"} onClose={() => setSheet(null)} title="Filter & sort">
        <h3 className={sectionTitle}>Sort by</h3>
        <div className="-mx-2 flex flex-col">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              aria-pressed={sort === s.id}
              className="flex items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {s.label}
              {sort === s.id && <Check className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            </button>
          ))}
        </div>

        {!isNotes && (
          <>
            <h3 className={`${sectionTitle} mt-4`}>File type</h3>
            <div className="flex gap-2">
              {DOC_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDocFilter(f.id)}
                  aria-pressed={docFilter === f.id}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${
                    docFilter === f.id
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setSort("recent");
              setDocFilter("all");
            }}
            className="btn-secondary flex-1"
          >
            Reset
          </button>
          <button type="button" onClick={() => setSheet(null)} className="btn-primary flex-1">
            Done
          </button>
        </div>
      </Modal>

      <ActionSheet open={sheet === "new"} onClose={() => setSheet(null)} title="Create new" actions={newActions} />

      <ActionSheet
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu ? (menu.kind === "folder" ? menu.item.name : itemTitle(menu.kind, menu.item)) : ""}
        actions={menuActions}
      />

      <MoveDialog
        target={moving}
        folders={folders}
        folderKind={kind}
        onClose={() => setMoving(null)}
        onMove={(targetId) => actions.moveItem(moving.kind, moving.item.id, targetId)}
      />

      <PromptDialog
        open={!!prompt}
        onClose={() => setPrompt(null)}
        title={promptConfig.title}
        label={promptConfig.label}
        initialValue={promptConfig.initial ?? ""}
        submitLabel={promptConfig.submit}
        onSubmit={submitPrompt}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={
          deleting === "all"
            ? "Delete all data?"
            : `Delete this ${{ doc: "document", note: "note", folder: "folder" }[deleting?.kind] ?? "item"}?`
        }
        message={deleteMessage()}
        confirmLabel={deleting === "all" ? "Delete everything" : "Delete"}
        onConfirm={confirmDelete}
      />

      <Modal open={sheet === "profile"} onClose={() => setSheet(null)} title="Profile & settings">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white">
            {initials(profile.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900 dark:text-white">{profile.name || "Guest"}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Data stored on this device</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSheet(null);
              setPrompt({ type: "profile" });
            }}
            className="icon-btn"
            aria-label="Edit name"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-4 gap-2 text-center">
          {[
            ["Notes", notes.length],
            ["Docs", docs.length],
            ["Folders", folders.length],
            ["Pinned", totalPinned],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-100 py-3 dark:bg-slate-800">
              <dd className="text-lg font-bold text-slate-900 dark:text-white">{value}</dd>
              <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
            </div>
          ))}
        </dl>

        <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200/70 dark:divide-slate-800 dark:border-slate-800">
          <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5">
            <span className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Moon className="h-5 w-5 text-slate-400" />
              Dark mode
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={theme === "dark"}
              onChange={actions.toggleTheme}
              className="relative h-6 w-11 cursor-pointer appearance-none rounded-full bg-slate-300 transition before:absolute before:top-0.5 before:left-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow before:transition checked:bg-indigo-600 checked:before:translate-x-5 dark:bg-slate-600 dark:checked:bg-indigo-500"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setSheet(null);
              setDeleting("all");
            }}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-rose-600 dark:text-rose-400"
          >
            <Trash2 className="h-5 w-5" />
            Delete all data
          </button>
        </div>
      </Modal>
    </div>
  );
}

function EmptyState({ isNotes, query, inFolder, filtered, onAdd }) {
  const Icon = query ? Search : inFolder ? FolderOpen : FolderPlus;
  let title = "Create your first folder";
  let text = isNotes
    ? "Notes are kept inside folders. Create a folder, then write your notes in it."
    : "Documents are kept inside folders. Create a folder, then add your PDFs and photos to it.";

  if (query) {
    title = "No results";
    text = `Nothing matches "${query.trim()}".`;
  } else if (filtered) {
    title = "Nothing here";
    text = "No documents of this type here.";
  } else if (inFolder) {
    title = "This folder is empty";
    text = isNotes ? "Add a note or a folder here." : "Add a document or a folder here.";
  }

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/60 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{text}</p>
      {!query && !filtered && (
        <button type="button" onClick={onAdd} className="btn-secondary mt-5">
          {inFolder ? <Plus className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />}
          {inFolder ? "Add something" : "New folder"}
        </button>
      )}
    </div>
  );
}
