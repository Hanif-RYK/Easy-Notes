import { describe, expect, it } from "vitest";
import { descendantIds, folderPath, folderTree, mergeDuplicateFolders, placeInFolders } from "../folders.js";

const folders = [
  { id: "a", name: "Work", parentId: null },
  { id: "b", name: "Sprint", parentId: "a" },
  { id: "c", name: "Week 1", parentId: "b" },
  { id: "d", name: "Home", parentId: null },
];

describe("folders", () => {
  it("finds a folder and all its sub-folders", () => {
    expect([...descendantIds(folders, "a")].sort()).toEqual(["a", "b", "c"]);
    expect([...descendantIds(folders, "d")]).toEqual(["d"]);
  });

  it("builds the path from the top level", () => {
    expect(folderPath(folders, "c").map((f) => f.name)).toEqual(["Work", "Sprint", "Week 1"]);
  });

  it("lists folders depth-first and sorted by name", () => {
    expect(folderTree(folders).map(({ folder, depth }) => `${depth}:${folder.name}`)).toEqual([
      "0:Home",
      "0:Work",
      "1:Sprint",
      "2:Week 1",
    ]);
  });

  it("puts items without a folder into a default folder", () => {
    let n = 0;
    const createId = () => `new-${++n}`;
    const items = [{ id: "1", folderId: "a" }, { id: "2", folderId: null }, { id: "3", folderId: "gone" }];
    const result = placeInFolders(items, folders, "My Notes", createId);
    expect(result.folders).toHaveLength(5);
    expect(result.items.map((i) => i.folderId)).toEqual(["a", "new-1", "new-1"]);
  });

  it("does nothing when every item has a folder", () => {
    const items = [{ id: "1", folderId: "a" }];
    const result = placeInFolders(items, folders, "My Notes", () => "x");
    expect(result.items).toBe(items);
    expect(result.folders).toBe(folders);
  });

  it("merges old separate note/document folders with the same name", () => {
    const data = {
      folders: [
        { id: "n", name: "Work", kind: "note", parentId: null },
        { id: "d", name: "work", kind: "doc", parentId: null },
        { id: "ns", name: "Sub", kind: "note", parentId: "n" },
        { id: "ds", name: "Sub", kind: "doc", parentId: "d" },
      ],
      notes: [{ id: "1", folderId: "ns" }],
      docs: [{ id: "2", folderId: "ds" }, { id: "3", folderId: "d" }],
    };
    const result = mergeDuplicateFolders(data);
    expect(result.folders.map((f) => f.id).sort()).toEqual(["n", "ns"]);
    expect(result.folders.every((f) => !("kind" in f))).toBe(true);
    expect(result.docs.map((d) => d.folderId)).toEqual(["ns", "n"]);
    expect(result.notes[0].folderId).toBe("ns");
  });
});
