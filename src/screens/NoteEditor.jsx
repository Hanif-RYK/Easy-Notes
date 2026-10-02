import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Check, MoreHorizontal, Pin, PinOff, Printer, Share2, Trash2 } from "lucide-react";
import { navigate } from "../hooks/useHashRoute.js";
import { goBack } from "../hooks/useHashRoute.js";
import { ActionSheet } from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { formatDate } from "../lib/format.js";

// The note is kept in the editor while typing and saved once the user pauses,
// so typing never waits for storage.
const AUTOSAVE_DELAY = 1000;

export function NoteEditor({ id, note, gone, actions }) {
  // The note was moved to the Trash (e.g. reached with the back button).
  if (gone) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <Trash2 className="h-8 w-8 text-slate-500 dark:text-slate-400" />
        <h1 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">This note is in the Trash</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">You can restore it from Settings → Trash.</p>
        <button type="button" onClick={() => navigate("trash", { replace: true })} className="btn-secondary mt-5">
          Open Trash
        </button>
      </main>
    );
  }
  return <Editor id={id} note={note} actions={actions} />;
}

function Editor({ id, note, actions }) {
  const toast = useToast();
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [menuOpen, setMenuOpen] = useState(false);

  const isNew = !note;
  const isEmpty = !title.trim() && !body.trim();
  const dirty = title !== (note?.title ?? "") || body !== (note?.body ?? "");

  // Latest draft, used when the editor closes.
  const draft = useRef({ id, title, body });
  useLayoutEffect(() => {
    draft.current = { id, title, body };
  }, [id, title, body]);
  const deleted = useRef(false);
  const bodyRef = useRef(null);

  // Autosave shortly after the user stops typing.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => actions.saveNote(draft.current), AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [title, body, dirty, actions]);

  // Save pending changes (or discard an empty note) when leaving the screen.
  useEffect(() => {
    return () => {
      if (!deleted.current) actions.closeNote(draft.current);
    };
  }, [actions]);

  // Let the app save the text still being typed if it is closed or hidden.
  useEffect(() => actions.registerDraft(() => (deleted.current ? null : draft.current)), [actions]);

  const share = async () => {
    const text = [title.trim(), body.trim()].filter(Boolean).join("\n\n");
    if (!text) return toast("Nothing to share yet");
    try {
      if (navigator.share) {
        await navigator.share({ title: title.trim() || "Note", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast("Note copied to clipboard");
      }
    } catch (err) {
      if (err?.name !== "AbortError") toast("Couldn't share this note");
    }
  };

  const moveToTrash = () => {
    deleted.current = true;
    if (isEmpty && isNew) return goBack(); // nothing to keep
    actions.saveNote(draft.current); // make sure the latest text is in the Trash too
    actions.trashItem("note", id);
    goBack();
  };

  // Only show "Saved" once everything is stored; no flicker while typing.
  const status = !isNew && !dirty ? "Saved" : "";

  return (
    <>
      <div className="flex min-h-dvh flex-col bg-white print:hidden dark:bg-slate-900">
        <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2 sm:px-4">
            <button type="button" onClick={() => goBack()} className="icon-btn" aria-label="Back to notes">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span
              className="flex flex-1 items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400"
              aria-live="polite"
            >
              {status === "Saved" && <Check className="h-3.5 w-3.5" />}
              {status}
            </span>
            {!isNew && (
              <button
                type="button"
                onClick={() => actions.togglePin("note", id)}
                className={`icon-btn ${note.pinned ? "text-amber-600 dark:text-amber-400" : ""}`}
                aria-label={note.pinned ? "Unpin note" : "Pin note"}
                aria-pressed={note.pinned}
                title={note.pinned ? "Unpin" : "Pin"}
              >
                <Pin className={`h-5 w-5 ${note.pinned ? "fill-current" : ""}`} />
              </button>
            )}
            <button type="button" onClick={() => setMenuOpen(true)} className="icon-btn" aria-label="More options">
              <MoreHorizontal className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => goBack()} className="btn-primary ml-1 h-9 rounded-full px-4">
              Done
            </button>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pt-5 pb-16 sm:px-8">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                bodyRef.current?.focus();
              }
            }}
            placeholder="Title"
            aria-label="Note title"
            maxLength={150}
            autoFocus={isNew}
            className="w-full bg-transparent text-2xl font-bold tracking-tight text-slate-900 outline-none placeholder:text-slate-500 focus-visible:outline-none dark:text-white dark:placeholder:text-slate-500 dark:text-slate-400"
          />
          {note && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Edited {formatDate(note.updatedAt)}</p>
          )}
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Start writing…"
            aria-label="Note text"
            className="mt-4 min-h-[60dvh] w-full flex-1 resize-none bg-transparent text-base leading-relaxed text-slate-700 outline-none [field-sizing:content] placeholder:text-slate-500 focus-visible:outline-none dark:text-slate-200 dark:placeholder:text-slate-500 dark:text-slate-400"
          />
        </main>
      </div>

      {/* Only visible when printing / saving as PDF */}
      <article className="hidden p-8 font-sans text-black print:block">
        <h1 className="text-2xl font-bold">{title.trim() || "Untitled"}</h1>
        <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
      </article>

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={title.trim() || "Untitled"}
        actions={[
          ...(!isNew
            ? [
                {
                  label: note.pinned ? "Unpin" : "Pin to top",
                  icon: note.pinned ? PinOff : Pin,
                  onClick: () => actions.togglePin("note", id),
                },
              ]
            : []),
          { label: "Share", icon: Share2, onClick: share },
          { label: "Print / Save as PDF", icon: Printer, onClick: () => setTimeout(() => window.print(), 250) },
          { label: "Move to Trash", icon: Trash2, danger: true, onClick: moveToTrash },
        ]}
      />
    </>
  );
}
