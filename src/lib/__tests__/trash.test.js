import { describe, expect, it } from "vitest";
import { daysLeft, liveData, moveToTrash, purgeTrash, removeForever, restore, trashEntries } from "../trash.js";

const DAY = 86_400_000;
const base = () => ({
  folders: [
    { id: "a", name: "Work", parentId: null },
    { id: "b", name: "Sub", parentId: "a" },
  ],
  notes: [
    { id: "n1", title: "In sub", folderId: "b" },
    { id: "n2", title: "In work", folderId: "a" },
  ],
  docs: [{ id: "d1", name: "file.pdf", folderId: "b" }],
});

describe("trash", () => {
  it("hides a trashed folder and everything inside it", () => {
    const data = moveToTrash(base(), "folder", "a", 1000);
    const live = liveData(data);
    expect(live.folders).toEqual([]);
    expect(live.notes).toEqual([]);
    expect(live.docs).toEqual([]);
    // Only the folder itself is listed in the Trash.
    expect(trashEntries(data).map((e) => e.item.id)).toEqual(["a"]);
  });

  it("restores an item", () => {
    const data = restore(moveToTrash(base(), "note", "n2"), "note", "n2");
    expect(data.notes.find((n) => n.id === "n2")).not.toHaveProperty("deletedAt");
    expect(liveData(data).notes).toHaveLength(2);
  });

  it("removes a folder forever with its contents and returns file ids to delete", () => {
    const { data, fileIds } = removeForever(base(), "folder", "a");
    expect(data.folders).toEqual([]);
    expect(data.notes).toEqual([]);
    expect(fileIds).toEqual(["d1"]);
  });

  it("purges only items older than 30 days", () => {
    const now = 100 * DAY;
    let data = moveToTrash(base(), "note", "n2", now - 31 * DAY);
    data = moveToTrash(data, "doc", "d1", now - 2 * DAY);
    const result = purgeTrash(data, { onlyExpired: true, now });
    expect(result.data.notes.map((n) => n.id)).toEqual(["n1"]);
    expect(result.data.docs.map((d) => d.id)).toEqual(["d1"]);
    expect(result.fileIds).toEqual([]);
  });

  it("empties the whole Trash", () => {
    const data = moveToTrash(moveToTrash(base(), "doc", "d1"), "folder", "a");
    const result = purgeTrash(data);
    expect(result.data).toEqual({ folders: [], notes: [], docs: [] });
    expect(result.fileIds).toEqual(["d1"]);
  });

  it("counts days left", () => {
    expect(daysLeft(0, 0)).toBe(30);
    expect(daysLeft(0, 29.5 * DAY)).toBe(1);
    expect(daysLeft(0, 40 * DAY)).toBe(0);
  });
});
