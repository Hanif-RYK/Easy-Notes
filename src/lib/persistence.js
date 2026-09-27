import { STORES, writeChanges } from "./db.js";

// Saves app data to IndexedDB by writing only the records that changed.
//
// IndexedDB writes are asynchronous, so a write started while the page is
// closing might not finish. To never lose data, every batch of changes is
// first copied to a small "journal" in localStorage (which is synchronous)
// and removed once IndexedDB has committed it. Anything left in the journal
// is applied again the next time the app starts.

const JOURNAL_KEY = "easy_notes_journal";

function readJournal() {
  try {
    const journal = JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]");
    return Array.isArray(journal) ? journal : [];
  } catch {
    return [];
  }
}

function writeJournal(entries) {
  try {
    if (entries.length) localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
    else localStorage.removeItem(JOURNAL_KEY);
  } catch {
    // Journal is only a safety net; ignore if storage is unavailable or full.
  }
}

/** Applies unfinished writes from the last session (see above). */
export function applyJournal(data) {
  const entries = readJournal();
  if (entries.length === 0) return { data, changes: [] };
  const next = { ...data };
  for (const { changes } of entries) {
    for (const store of STORES) {
      if (!changes[store]) continue;
      const map = new Map(next[store].map((r) => [r.id, r]));
      for (const record of changes[store].put ?? []) map.set(record.id, record);
      for (const id of changes[store].del ?? []) map.delete(id);
      next[store] = [...map.values()];
    }
  }
  return { data: next, changes: entries.map((e) => e.changes) };
}

export const clearJournal = () => writeJournal([]);

/** Records that differ between two snapshots, per store. */
export function diff(prev, next) {
  const changes = {};
  for (const store of STORES) {
    const before = new Map(prev[store].map((r) => [r.id, r]));
    const put = next[store].filter((r) => before.get(r.id) !== r);
    const nextIds = new Set(next[store].map((r) => r.id));
    const del = [...before.keys()].filter((id) => !nextIds.has(id));
    if (put.length || del.length) changes[store] = { put, del };
  }
  return Object.keys(changes).length ? changes : null;
}

/**
 * Creates a saver for `initial` (the data as stored). Call `update(data)`
 * with every new state and `flush()` to write the differences now.
 */
export function createSaver(initial, { onError } = {}) {
  let saved = initial;
  let latest = initial;

  return {
    update(data) {
      latest = data;
    },
    flush() {
      const changes = diff(saved, latest);
      if (!changes) return;
      saved = latest;

      const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      writeJournal([...readJournal(), { token, changes }]);
      writeChanges(changes)
        .then(() => writeJournal(readJournal().filter((e) => e.token !== token)))
        .catch((err) => onError?.(err)); // stays in the journal and is retried on next start
    },
  };
}
