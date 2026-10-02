import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileQuestion,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Share2,
  Trash2,
} from "lucide-react";
import { goBack } from "../hooks/useHashRoute.js";
import { ActionSheet, PromptDialog } from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { getFile } from "../lib/db.js";
import { PdfPreview } from "../components/PdfPreview.jsx";
import { formatDate, formatSize, isImage, isPdf } from "../lib/format.js";

export function DocViewer({ doc, actions }) {
  const toast = useToast();
  const [file, setFile] = useState({ status: "loading", url: null, blob: null });
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);

  const docId = doc?.id;

  // Load the file from IndexedDB and expose it through a temporary URL.
  useEffect(() => {
    if (!docId) return;
    let url;
    let cancelled = false;
    getFile(docId)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) return setFile({ status: "missing", url: null, blob: null });
        url = URL.createObjectURL(blob);
        setFile({ status: "ready", url, blob });
      })
      .catch(() => !cancelled && setFile({ status: "missing", url: null, blob: null }));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [docId]);

  if (!doc) {
    return (
      <Shell title="Not found" onBack={() => goBack("docs")}>
        <Message icon={FileQuestion} title="Document not found" text="It may have been deleted." />
      </Shell>
    );
  }

  const download = () => {
    if (!file.url) return;
    const a = document.createElement("a");
    a.href = file.url;
    a.download = doc.name;
    a.click();
  };

  const share = async () => {
    if (!file.blob) return;
    const shareFile = new File([file.blob], doc.name, { type: doc.type });
    try {
      if (navigator.canShare?.({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile], title: doc.name });
      } else {
        download();
        toast("Sharing isn't supported here — file downloaded instead");
      }
    } catch (err) {
      if (err?.name !== "AbortError") toast("Couldn't share this file");
    }
  };

  const moveToTrash = () => {
    actions.trashItem("doc", doc.id);
    goBack("docs");
  };

  return (
    <Shell
      title={doc.name}
      subtitle={`${formatSize(doc.size)} · ${formatDate(doc.createdAt)}`}
      onBack={() => goBack("docs")}
      actions={
        <>
          <button
            type="button"
            onClick={() => actions.togglePin("doc", doc.id)}
            className={`icon-btn ${doc.pinned ? "text-amber-600 dark:text-amber-400" : ""}`}
            aria-label={doc.pinned ? "Unpin document" : "Pin document"}
            aria-pressed={doc.pinned}
          >
            <Pin className={`h-5 w-5 ${doc.pinned ? "fill-current" : ""}`} />
          </button>
          <button type="button" onClick={() => setMenuOpen(true)} className="icon-btn" aria-label="More options">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </>
      }
    >
      {file.status === "loading" && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500 dark:text-slate-400" aria-label="Loading" />
        </div>
      )}

      {file.status === "missing" && (
        <Message
          icon={FileQuestion}
          title="File not available"
          text="The file couldn't be loaded. Browser storage may have been cleared."
        />
      )}

      {file.status === "ready" && isImage(doc.type) && (
        <div className="flex flex-1 items-center justify-center p-4">
          <img src={file.url} alt={doc.name} className="max-h-[calc(100dvh-7rem)] max-w-full rounded-lg shadow-md" />
        </div>
      )}

      {file.status === "ready" && isPdf(doc.type) && !pdfFailed && (
        <PdfPreview blob={file.blob} onError={() => setPdfFailed(true)} />
      )}

      {file.status === "ready" && isPdf(doc.type) && pdfFailed && (
        // The PDF couldn't be drawn (e.g. damaged or protected); offer to open it instead.
        <Message
            icon={FileText}
            title={doc.name}
          text="This PDF can't be previewed here."
            action={
              <div className="mt-5 flex gap-3">
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </a>
                <button type="button" onClick={download} className="btn-secondary">
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            }
        />
      )}

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={doc.name}
        actions={[
          {
            label: doc.pinned ? "Unpin" : "Pin to top",
            icon: doc.pinned ? PinOff : Pin,
            onClick: () => actions.togglePin("doc", doc.id),
          },
          { label: "Rename", icon: Pencil, onClick: () => setRenaming(true) },
          ...(file.status === "ready"
            ? [
                { label: "Share", icon: Share2, onClick: share },
                { label: "Download", icon: Download, onClick: download },
              ]
            : []),
          { label: "Move to Trash", icon: Trash2, danger: true, onClick: moveToTrash },
        ]}
      />

      <PromptDialog
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Rename document"
        label="Document name"
        initialValue={doc.name}
        onSubmit={(name) => actions.renameDoc(doc.id, name)}
      />

    </Shell>
  );
}

function Shell({ title, subtitle, onBack, actions, children }) {
  return (
    <div className="flex h-dvh flex-col bg-slate-100 dark:bg-slate-950">
      <header className="shrink-0 border-b border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-2 sm:px-4">
          <button type="button" onClick={onBack} className="icon-btn" aria-label="Back to documents">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 px-1">
            <h1 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {actions}
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</main>
    </div>
  );
}

function Message({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 max-w-xs truncate text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{text}</p>
      {action}
    </div>
  );
}
