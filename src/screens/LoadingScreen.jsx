import { Loader2, RotateCw } from "lucide-react";

const MESSAGES = {
  blocked: {
    title: "Please close other Easy Notes tabs",
    text: "Easy Notes was updated. An older version is still open in another tab or window, which stops the update. Close it and this page continues by itself.",
  },
  slow: {
    title: "Easy Notes is taking long to open",
    text: "If Easy Notes is open in another tab or window, close it. Then reload this page.",
  },
  error: {
    title: "Couldn't open your data",
    text: "Close any other Easy Notes tabs and reload this page. If it still doesn't open, your browser may be blocking storage (for example in a private window).",
  },
};

/** Shown while data loads; explains the problem if loading is stuck or fails. */
export function LoadingScreen({ state }) {
  const message = MESSAGES[state];

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      {state !== "error" && <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-label="Loading" />}
      {message && (
        <div className="animate-pop-in mt-6 max-w-sm">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{message.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{message.text}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-6">
            <RotateCw className="h-4 w-4" />
            Reload
          </button>
        </div>
      )}
    </main>
  );
}
