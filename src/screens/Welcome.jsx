import { useState } from "react";
import { Lock } from "lucide-react";
import { Logo } from "../components/Logo.jsx";

export function Welcome({ onStart }) {
  const [name, setName] = useState("");

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <form
        className="animate-pop-in w-full max-w-sm text-center"
        onSubmit={(e) => {
          e.preventDefault();
          onStart(name.trim());
        }}
      >
        <Logo className="mx-auto h-16 w-16" />
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Easy Notes</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Your notes and documents, simply organised in one place.
        </p>

        <div className="mt-8 text-left">
          <label htmlFor="welcome-name" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            What should we call you? <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="welcome-name"
            className="input h-12"
            placeholder="Your name"
            autoComplete="given-name"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <button type="submit" className="btn-primary mt-4 h-12 w-full">
          Get started
        </button>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <Lock className="h-3.5 w-3.5" />
          Everything is saved privately on this device.
        </p>
      </form>
    </main>
  );
}
