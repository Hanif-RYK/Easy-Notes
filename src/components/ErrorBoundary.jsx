import { Component } from "react";

/** Shows a friendly message with a Reload button instead of a blank page if a screen crashes. */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Easy Notes crashed", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Your notes are safe. Please reload the page. If this keeps happening, go back to the main screen.
        </p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => window.location.reload()} className="btn-primary">
            Reload
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.hash = "#/notes";
              window.location.reload();
            }}
            className="btn-secondary"
          >
            Main screen
          </button>
        </div>
      </main>
    );
  }
}
