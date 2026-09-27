import { describe, expect, it } from "vitest";
import { descendantIds, folderPath, folderTree, placeInFolders, splitFoldersByKind } from "../folders.js";

const folders = [
  { id: "a", name: "Work", kind: "note", parentId: null },
  { id: "b", name: "Sprint", kind: "note", parentId: "a" },
  { id: "c", name: "Week 1", kind: "note", parentId: "b" },
  { id: "d", name: "Home", kind: "note", parentId: null },
  { id: "x", name: "Bills", kind: "doc", parentId: null },
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
      "0:Bills",
      "0:Home",
      "0:Work",
      "1:Sprint",
      "2:Week 1",
    ]);
  });

  it("puts items without a folder of their kind into a default folder", () => {
    let n = 0;
    const createId = () => `new-${++n}`;
    const items = [
      { id: "1", folderId: "a" },
      { id: "2", folderId: null },
      { id: "3", folderId: "gone" },
      { id: "4", folderId: "x" }, // a Documents folder — not allowed for a note
    ];
    const result = placeInFolders(items, folders, "note", "My Notes", createId);
    expect(result.folders).toHaveLength(6);
    expect(result.folders.at(-1)).toMatchObject({ id: "new-1", kind: "note", name: "My Notes" });
    expect(result.items.map((i) => i.folderId)).toEqual(["a", "new-1", "new-1", "new-1"]);
  });

  it("does nothing when every item has a folder", () => {
    const items = [{ id: "1", folderId: "a" }];
    const result = placeInFolders(items, folders, "note", "My Notes", () => "x");
    expect(result.items).toBe(items);
    expect(result.folders).toBe(folders);
  });

  it("splits shared folders into separate Notes and Documents folders", () => {
    let n = 0;
    const createId = () => `copy-${++n}`;
    const data = {
      folders: [
        { id: "both", name: "Work", parentId: null },
        { id: "sub", name: "Sub", parentId: "both" },
        { id: "emptySub", name: "Empty sub", parentId: "sub" },
        { id: "notesOnly", name: "Ideas", parentId: null },
        { id: "docsOnly", name: "Bills", parentId: null },
        { id: "empty", name: "New", parentId: null },
      ],
      notes: [
        { id: "n1", folderId: "sub" },
        { id: "n2", folderId: "notesOnly" },
      ],
      docs: [
        { id: "d1", folderId: "both" },
        { id: "d2", folderId: "docsOnly" },
      ],
    };
    const result = splitFoldersByKind(data, createId);
    const find = (name, kind) => result.folders.find((f) => f.name === name && f.kind === kind);

    // "Work" has notes (in Sub) and documents: one copy per tab.
    expect(find("Work", "note").id).toBe("both");
    const workDocs = find("Work", "doc");
    expect(workDocs.id).not.toBe("both");
    expect(result.docs.find((d) => d.id === "d1").folderId).toBe(workDocs.id);
    // "Sub" only holds notes, so it stays in Notes under the Notes "Work".
    expect(find("Sub", "note").parentId).toBe("both");
    expect(find("Sub", "doc")).toBeUndefined();
    // An empty sub-folder follows its parent.
    expect(find("Empty sub", "note").parentId).toBe("sub");
    expect(find("Empty sub", "doc")).toBeUndefined();
    // Single-kind folders keep their id and get that kind.
    expect(find("Ideas", "note").id).toBe("notesOnly");
    expect(find("Ideas", "doc")).toBeUndefined();
    expect(find("Bills", "doc").id).toBe("docsOnly");
    // An empty top-level folder is kept in both tabs.
    expect(find("New", "note")).toBeDefined();
    expect(find("New", "doc")).toBeDefined();
    // Notes never move.
    expect(result.notes).toBe(data.notes);
  });

  it("leaves folders that already have a kind unchanged", () => {
    const data = { folders, notes: [], docs: [] };
    expect(splitFoldersByKind(data, () => "x")).toBe(data);
  });
});
