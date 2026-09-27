import { describe, expect, it } from "vitest";
import { backupFileName, createBackup, mergeBackup, parseBackup } from "../backup.js";

const data = {
  folders: [{ id: "f", name: "Work", parentId: null, createdAt: 1 }],
  notes: [{ id: "n", title: "Hi", body: "Text", pinned: true, folderId: "f", createdAt: 1, updatedAt: 2 }],
  docs: [{ id: "d", name: "a.pdf", type: "application/pdf", size: 3, pinned: false, folderId: "f", createdAt: 1 }],
};

describe("backup", () => {
  it("creates a backup that can be read back", async () => {
    const getFile = async () => new Blob(["pdf"], { type: "application/pdf" });
    const { blob, missing } = await createBackup(data, getFile);
    expect(missing).toBe(0);
    const parsed = parseBackup(await blob.text());
    expect(parsed.notes).toEqual(data.notes);
    expect(parsed.folders).toEqual(data.folders);
    expect(parsed.docs[0].data).toMatch(/^data:application\/pdf;base64,/);
  });

  it("skips documents whose file is missing", async () => {
    const { blob, missing } = await createBackup(data, async () => undefined);
    expect(missing).toBe(1);
    expect(parseBackup(await blob.text()).docs).toEqual([]);
  });

  it("rejects files that are not backups", () => {
    expect(() => parseBackup("not json")).toThrow(/isn't an Easy Notes backup/);
    expect(() => parseBackup('{"app":"other"}')).toThrow(/isn't an Easy Notes backup/);
    expect(() => parseBackup('{"app":"easy-notes","version":99,"notes":[],"docs":[],"folders":[]}')).toThrow(/newer/);
  });

  it("drops invalid records and unsafe document types", () => {
    const text = JSON.stringify({
      app: "easy-notes",
      version: 1,
      folders: [{ id: 1, name: "bad" }],
      notes: [{ id: "x", title: "no body" }],
      docs: [{ id: "s", name: "x.html", type: "text/html", data: "data:text/html;base64,PHNjcmlwdD4=" }],
    });
    expect(parseBackup(text)).toEqual({ folders: [], notes: [], docs: [] });
  });

  it("merges a backup into existing data", () => {
    const current = {
      folders: [{ id: "f2", name: "Work", parentId: null, createdAt: 5 }],
      notes: [{ id: "n", title: "Old", body: "", folderId: "f2", createdAt: 1, updatedAt: 1 }],
      docs: [],
    };
    const backup = { folders: data.folders, notes: data.notes, docs: [{ ...data.docs[0], data: "data:" }] };
    const merged = mergeBackup(current, backup, () => "new");
    // Same-named folders are merged, the backup's note wins, docs lose their data.
    expect(merged.folders).toHaveLength(1);
    expect(merged.notes).toHaveLength(1);
    expect(merged.notes[0].title).toBe("Hi");
    expect(merged.notes[0].folderId).toBe(merged.folders[0].id);
    expect(merged.docs[0]).not.toHaveProperty("data");
  });

  it("names the file with the date", () => {
    expect(backupFileName(new Date(2026, 0, 5))).toBe("easy-notes-backup-2026-01-05.json");
  });
});
