import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { loadAll } from "../db.js";
import { applyJournal, createSaver, diff } from "../persistence.js";

// Minimal localStorage for the journal.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const empty = { notes: [], docs: [], folders: [] };
const flushPromises = () => new Promise((r) => setTimeout(r, 50));

describe("persistence", () => {
  beforeEach(() => store.clear());

  it("finds only changed and removed records", () => {
    const a = { id: "a" };
    const b = { id: "b" };
    const prev = { ...empty, notes: [a, b] };
    const b2 = { id: "b", title: "changed" };
    const c = { id: "c" };
    expect(diff(prev, { ...empty, notes: [b2, c] })).toEqual({ notes: { put: [b2, c], del: ["a"] } });
    expect(diff(prev, prev)).toBeNull();
  });

  it("writes changes to IndexedDB and clears the journal afterwards", async () => {
    const saver = createSaver(empty);
    const note = { id: "n1", title: "Hello" };
    saver.update({ ...empty, notes: [note] });
    saver.flush();
    // The journal holds the change until IndexedDB has committed it.
    expect(JSON.parse(store.get("easy_notes_journal"))).toHaveLength(1);
    await flushPromises();
    expect(store.has("easy_notes_journal")).toBe(false);
    expect((await loadAll()).notes).toEqual([note]);
  });

  it("re-applies unfinished writes from the journal", () => {
    store.set(
      "easy_notes_journal",
      JSON.stringify([{ token: "t", changes: { notes: { put: [{ id: "x", title: "Saved at close" }], del: ["old"] } } }]),
    );
    const { data } = applyJournal({ ...empty, notes: [{ id: "old" }] });
    expect(data.notes).toEqual([{ id: "x", title: "Saved at close" }]);
  });
});
