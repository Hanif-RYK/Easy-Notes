import { FileText, FolderPlus, Lock } from "lucide-react";
import { Logo } from "../components/Logo.jsx";

const STEPS = [
  { icon: FolderPlus, text: "Create a folder" },
  { icon: FileText, text: "Write notes or add PDFs and photos inside it" },
  { icon: Lock, text: "Everything stays private on this device" },
];

export function Welcome({ onStart }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <div className="animate-pop-in w-full max-w-sm text-center">
        <Logo className="mx-auto h-16 w-16" />
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Easy Notes</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Your notes and documents, simply organised in folders.
        </p>

        <ol className="mt-8 space-y-3 text-left">
          {STEPS.map(({ icon: Icon, text }, i) => (
            <li
              key={text}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200">
                <span className="sr-only">Step {i + 1}: </span>
                {text}
              </span>
            </li>
          ))}
        </ol>

        <button type="button" onClick={onStart} className="btn-primary mt-8 h-12 w-full">
          Get started
        </button>
      </div>
    </main>
  );
}
