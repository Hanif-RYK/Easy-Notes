import { useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  Camera,
  Check,
  FileText,
  Image as ImageIcon,
  Moon,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  StickyNote,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { navigate } from "../hooks/useHashRoute.js";
import { ActionSheet, ConfirmDialog, Modal, PromptDialog } from "../components/Modal.jsx";
import { createId } from "../lib/storage.js";
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

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function sortItems(items, sort, getTitle, getDate) {
  const list = [...items];
  if (sort === "az") return list.sort((a, b) => getTitle(a).localeCompare(getTitle(b), undefined, { sensitivity: "base" }));
  if (sort === "oldest") return list.sort((a, b) => getDate(a) - getDate(b));
  return list.sort((a, b) => getDate(b) - getDate(a));
}

export function Home({ tab, notes, docs, profile, theme, actions }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [docFilter, setDocFilter] = useState("all");
  const [sheet, setSheet] = useState(null); // "sort" | "add" | "profile" | null
  const [menuItem, setMenuItem] = useState(null); // { kind, item }
  const [renaming, setRenaming] = useState(null); // doc | "profile"
  const [deleting, setDeleting] = useState(null); // { kind, item } | "all"

  const fileInput = useRef(null);
  const cameraInput = useRef(null);

  const isNotes = tab === "notes";
  const q = query.trim().toLowerCase();

  const visibleNotes = useMemo(() => {
    const filtered = q
      ? notes.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
      : notes;
    return sortItems(filtered, sort, (n) => n.title || "Untitled", (n) => n.updatedAt);
  }, [notes, q, sort]);

  const visibleDocs = useMemo(() => {
    let filtered = q ? docs.filter((d) => d.name.toLowerCase().includes(q)) : docs;
    if (docFilter === "pdf") filtered = filtered.filter((d) => isPdf(d.type));
    if (docFilter === "image") filtered = filtered.filter((d) => isImage(d.type));
    return sortItems(filtered, sort, (d) => d.name, (d) => d.createdAt);
  }, [docs, q, sort, docFilter]);

  const items = isNotes ? visibleNotes : visibleDocs;
  const pinned = items.filter((i) => i.pinned);
  const others = items.filter((i) => !i.pinned);

  const openItem = (kind, item) => navigate(`${kind}/${item.id}`);

  const addNew = () => {
    if (isNotes) navigate(`note/${createId()}`);
    else setSheet("add");
  };

  const onFilesPicked = (e) => {
    actions.addFiles(e.target.files);
    e.target.value = ""; // allow picking the same file again
  };

  const renderRow = (item) => {
    const kind = isNotes ? "note" : "doc";
    const title = isNotes ? item.title || "Untitled" : item.name;
    const Icon = isNotes ? StickyNote : isImage(item.type) ? ImageIcon : FileText;
    const iconColor = isNotes
      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
      : isImage(item.type)
        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
        : "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300";

    return (
      <li
        key={item.id}
        className="group flex items-center rounded-2xl border border-slate-200/70 bg-white transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
      >
        <button
          type="button"
          onClick={() => openItem(kind, item)}
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
              {isNotes
                ? `${formatDate(item.updatedAt)} · ${preview(item.body)}`
                : `${formatDate(item.createdAt)} · ${formatSize(item.size)}`}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMenuItem({ kind, item })}
          className="icon-btn mr-2 text-slate-400"
          aria-label={`Options for ${title}`}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </li>
    );
  };

  const menuActions = menuItem
    ? [
        {
          label: menuItem.item.pinned ? "Unpin" : "Pin to top",
          icon: menuItem.item.pinned ? PinOff : Pin,
          onClick: () => actions.togglePin(menuItem.kind, menuItem.item.id),
        },
        ...(menuItem.kind === "doc"
          ? [{ label: "Rename", icon: Pencil, onClick: () => setRenaming(menuItem.item) }]
          : [{ label: "Edit", icon: Pencil, onClick: () => openItem("note", menuItem.item) }]),
        { label: "Delete", icon: Trash2, danger: true, onClick: () => setDeleting(menuItem) },
      ]
    : [];

  const totalPinned = notes.filter((n) => n.pinned).length + docs.filter((d) => d.pinned).length;
  const displayName = profile.name || "there";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto max-w-3xl px-4 pt-4 pb-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                {greeting()}, {displayName}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Easy Notes</h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={actions.toggleTheme}
                className="icon-btn"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={theme === "dark" ? "Light mode" : "Dark mode"}
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => setSheet("profile")}
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-95"
                aria-label="Profile and settings"
              >
                {initials(profile.name)}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isNotes ? "Search notes" : "Search documents"}
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

          {/* Tabs + sort */}
          <div className="mt-3 flex items-center gap-2">
            <div role="tablist" className="flex flex-1 rounded-xl bg-slate-200/60 p-1 dark:bg-slate-800/80">
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
            <button
              type="button"
              onClick={() => setSheet("sort")}
              className={`icon-btn h-11 w-11 rounded-xl border ${
                sort !== "recent"
                  ? "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/50 dark:bg-indigo-500/15 dark:text-indigo-300"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
              }`}
              aria-label="Sort"
              title="Sort"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* List */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-32 sm:px-6">
        {!isNotes && docs.length > 0 && (
          <div className="mb-4 flex gap-2">
            {DOC_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDocFilter(f.id)}
                aria-pressed={docFilter === f.id}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  docFilter === f.id
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState isNotes={isNotes} query={query} filtered={!isNotes && docFilter !== "all"} onAdd={addNew} />
        ) : (
          <div className="space-y-6">
            {pinned.length > 0 && (
              <section>
                <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  Pinned
                </h2>
                <ul className="space-y-2">{pinned.map(renderRow)}</ul>
              </section>
            )}
            {others.length > 0 && (
              <section>
                {pinned.length > 0 && (
                  <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    Others
                  </h2>
                )}
                <ul className="space-y-2">{others.map(renderRow)}</ul>
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
            onClick={addNew}
            className="btn-primary pointer-events-auto h-14 rounded-full px-6 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
            {isNotes ? "New note" : "Add document"}
          </button>
        </div>
      </div>

      <input ref={fileInput} type="file" accept="application/pdf,image/*" multiple hidden onChange={onFilesPicked} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onFilesPicked} />

      {/* Sheets & dialogs */}
      <Modal open={sheet === "sort"} onClose={() => setSheet(null)} title="Sort by">
        <div className="-mx-2 flex flex-col">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSort(s.id);
                setSheet(null);
              }}
              className="flex items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {s.label}
              {sort === s.id && <Check className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            </button>
          ))}
        </div>
      </Modal>

      <ActionSheet
        open={sheet === "add"}
        onClose={() => setSheet(null)}
        title="Add document"
        actions={[
          { label: "Upload PDF or image", icon: Upload, onClick: () => fileInput.current?.click() },
          { label: "Take a photo", icon: Camera, onClick: () => cameraInput.current?.click() },
        ]}
      />

      <ActionSheet
        open={!!menuItem}
        onClose={() => setMenuItem(null)}
        title={menuItem ? (menuItem.kind === "note" ? menuItem.item.title || "Untitled" : menuItem.item.name) : ""}
        actions={menuActions}
      />

      <PromptDialog
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title={renaming === "profile" ? "Your name" : "Rename document"}
        label={renaming === "profile" ? "Name" : "Document name"}
        initialValue={renaming === "profile" ? profile.name : renaming?.name}
        onSubmit={(value) =>
          renaming === "profile" ? actions.renameProfile(value) : actions.renameDoc(renaming.id, value)
        }
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={deleting === "all" ? "Delete all data?" : `Delete this ${deleting?.kind === "doc" ? "document" : "note"}?`}
        message={
          deleting === "all"
            ? "All notes, documents and settings on this device will be permanently removed."
            : `"${deleting?.kind === "doc" ? deleting.item.name : deleting?.item.title || "Untitled"}" will be permanently deleted.`
        }
        confirmLabel={deleting === "all" ? "Delete everything" : "Delete"}
        onConfirm={() => {
          if (deleting === "all") actions.resetApp();
          else if (deleting.kind === "doc") actions.removeDoc(deleting.item.id);
          else actions.removeNote(deleting.item.id);
        }}
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
              setRenaming("profile");
            }}
            className="icon-btn"
            aria-label="Edit name"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            ["Notes", notes.length],
            ["Documents", docs.length],
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

function EmptyState({ isNotes, query, filtered, onAdd }) {
  const Icon = query ? Search : isNotes ? StickyNote : FileText;
  let title = isNotes ? "No notes yet" : "No documents yet";
  let text = isNotes ? "Write down your first idea." : "Keep your PDFs and photos safe in one place.";

  if (query) {
    title = "No results";
    text = `Nothing matches "${query.trim()}".`;
  } else if (filtered) {
    title = "Nothing here";
    text = "No documents of this type yet.";
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
          <Plus className="h-4 w-4" />
          {isNotes ? "New note" : "Add document"}
        </button>
      )}
    </div>
  );
}
