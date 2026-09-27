import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  HardDrive,
  Moon,
  Share,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react";
import { goBack, navigate } from "../hooks/useHashRoute.js";
import { ConfirmDialog } from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { canInstall, isIos, isStandalone, onInstallChange, promptInstall } from "../lib/install.js";
import { formatDate, formatSize } from "../lib/format.js";
import { requestPersistentStorage, storageStatus } from "../lib/storage.js";

const card =
  "divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900";
const row = "flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm";
const rowButton = `${row} font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800`;
const heading = "mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400";

export function Settings({ data, trashCount, theme, lastBackup, actions }) {
  const toast = useToast();
  const restoreInput = useRef(null);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(null); // { summary, apply }
  const [storage, setStorage] = useState({ usage: null, persisted: false });
  const [installable, setInstallable] = useState(canInstall);

  useEffect(() => {
    storageStatus().then(setStorage);
    return onInstallChange(() => setInstallable(canInstall()));
  }, []);

  const backup = async () => {
    setBusy(true);
    await actions.exportBackup();
    setBusy(false);
  };

  const onRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setRestoring(await actions.readBackup(file));
    } catch (err) {
      toast(err.message || "Couldn't read this file");
    }
  };

  const protect = async () => {
    const ok = await requestPersistentStorage();
    setStorage(await storageStatus());
    toast(ok ? "Your data is protected" : "Your browser didn't allow this. Installing the app helps.");
  };

  const summary = restoring?.summary;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2 sm:px-4">
          <button type="button" onClick={() => goBack()} className="icon-btn" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 pt-5 pb-16 sm:px-6">
        {/* Summary */}
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Folders", data.folders.length],
            ["Notes", data.notes.length],
            ["Documents", data.docs.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200/70 bg-white py-3 dark:border-slate-800 dark:bg-slate-900">
              <dd className="text-lg font-bold text-slate-900 dark:text-white">{value}</dd>
              <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
            </div>
          ))}
        </dl>

        {/* Appearance */}
        <section>
          <h2 className={heading}>Appearance</h2>
          <div className={card}>
            <label className={`${row} cursor-pointer justify-between`}>
              <span className="flex items-center gap-3 font-medium text-slate-700 dark:text-slate-200">
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
          </div>
        </section>

        {/* Backup */}
        <section>
          <h2 className={heading}>Backup</h2>
          <div className={card}>
            <p className={`${row} text-slate-500 dark:text-slate-400`}>
              Your data is only on this device. Download a backup regularly and keep it safe (for example in Google
              Drive or email) so you never lose your notes.
            </p>
            <button type="button" onClick={backup} disabled={busy} className={rowButton}>
              <Download className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="flex-1">
                {busy ? "Preparing backup…" : "Download backup"}
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  Last backup: {lastBackup ? formatDate(lastBackup) : "never"}
                </span>
              </span>
            </button>
            <button type="button" onClick={() => restoreInput.current?.click()} className={rowButton}>
              <Upload className="h-5 w-5 text-slate-400" />
              <span className="flex-1">Restore from backup</span>
            </button>
          </div>
          <input ref={restoreInput} type="file" accept="application/json,.json" hidden onChange={onRestoreFile} />
        </section>

        {/* Trash */}
        <section>
          <h2 className={heading}>Trash</h2>
          <div className={card}>
            <button type="button" onClick={() => navigate("trash")} className={rowButton}>
              <Trash2 className="h-5 w-5 text-slate-400" />
              <span className="flex-1">
                Trash
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  {trashCount === 0 ? "Empty" : `${trashCount} ${trashCount === 1 ? "item" : "items"} · deleted after 30 days`}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
            </button>
          </div>
        </section>

        {/* Storage & app */}
        <section>
          <h2 className={heading}>Storage & app</h2>
          <div className={card}>
            <div className={`${row} text-slate-700 dark:text-slate-200`}>
              <HardDrive className="h-5 w-5 text-slate-400" />
              <span className="flex-1 font-medium">
                Space used
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  {storage.usage === null ? "Unknown" : formatSize(storage.usage)}
                </span>
              </span>
            </div>
            {storage.persisted ? (
              <div className={`${row} text-emerald-700 dark:text-emerald-400`}>
                <ShieldCheck className="h-5 w-5" />
                <span className="flex-1 font-medium">Protected from automatic deletion</span>
              </div>
            ) : (
              <button type="button" onClick={protect} className={rowButton}>
                <ShieldCheck className="h-5 w-5 text-slate-400" />
                <span className="flex-1">
                  Protect my data
                  <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                    Ask the browser not to delete your data when space is low
                  </span>
                </span>
              </button>
            )}
            {!isStandalone() && installable && (
              <button
                type="button"
                onClick={() => promptInstall().then((ok) => ok && toast("Easy Notes installed"))}
                className={rowButton}
              >
                <Smartphone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span className="flex-1">
                  Install app
                  <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                    Open from your home screen, even offline
                  </span>
                </span>
              </button>
            )}
            {!isStandalone() && !installable && isIos() && (
              <div className={`${row} text-slate-700 dark:text-slate-200`}>
                <Share className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="flex-1">
                  <span className="font-medium">Install on iPhone / iPad</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Tap Share, then “Add to Home Screen”. This also keeps Safari from deleting your data.
                  </span>
                </span>
              </div>
            )}
          </div>
        </section>

      </main>

      <ConfirmDialog
        open={!!restoring}
        onClose={() => setRestoring(null)}
        title="Restore this backup?"
        message={
          summary
            ? `It contains ${summary.folders} folders, ${summary.notes} notes and ${summary.docs} documents. They will be added to what you have now; items that exist in both are replaced by the backup's version.`
            : ""
        }
        confirmLabel="Restore"
        tone="primary"
        onConfirm={() => restoring.apply()}
      />

    </div>
  );
}
