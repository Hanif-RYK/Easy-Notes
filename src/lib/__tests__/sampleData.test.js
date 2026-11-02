import { Buffer } from "node:buffer";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { createBackup, mergeBackup, parseBackup } from "../backup.js";
import { addRecords, buildSampleData, deleteAllData } from "../sampleData.js";
import { canvasToPng, createCanvas, makePdf } from "../sampleFiles.js";

let counter = 0;
const createId = () => `id-${++counter}`;
const NOW = Date.UTC(2026, 10, 2);

const bytesOf = async (blob) => new Uint8Array(await blob.arrayBuffer());

function readPngChunks(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks = [];
  let pos = 8;
  while (pos < bytes.length) {
    const length = view.getUint32(pos);
    const type = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
    chunks.push({ type, data: bytes.subarray(pos + 8, pos + 8 + length) });
    pos += 12 + length;
  }
  return chunks;
}

describe("sample files", () => {
  it("makes a valid one-page PDF with a correct cross-reference table", async () => {
    const text = await makePdf("Title (test)", ["Line one", { text: "Bold — dash", bold: true }]).text();
    expect(text.startsWith("%PDF-1.4\n")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    // Non-ASCII is replaced and parentheses are escaped.
    expect(text).toContain("(Bold - dash) Tj");
    expect(text).toContain("(Title \\(test\\)) Tj");
    const startxref = Number(text.match(/startxref\n(\d+)/)[1]);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");
    const offsets = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(offsets).toHaveLength(6);
    offsets.forEach((offset, i) => expect(text.slice(offset).startsWith(`${i + 1} 0 obj`)).toBe(true));
  });

  it("makes a valid palette PNG", async () => {
    const canvas = createCanvas(12, 9, ["#ffffff", "#112233"]);
    canvas.rect(1, 1, 3, 3, 1);
    canvas.text(0, 0, "A", 1, 1);
    const bytes = await bytesOf(canvasToPng(canvas));
    expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const chunks = readPngChunks(bytes);
    expect(chunks.map((c) => c.type)).toEqual(["IHDR", "PLTE", "IDAT", "IEND"]);
    expect([...chunks[1].data]).toEqual([0xff, 0xff, 0xff, 0x11, 0x22, 0x33]);
    const raw = inflateSync(Buffer.from(chunks[2].data)); // also checks the Adler-32
    expect(raw.length).toBe((12 + 1) * 9);
    expect(raw[2 * 13 + 1 + 2]).toBe(1); // pixel (2,2) is inside the rectangle
  });
});

describe("buildSampleData", () => {
  const sample = buildSampleData({ createId, now: NOW });
  const byId = new Map(sample.folders.map((f) => [f.id, f]));

  it("creates note folders with sub-folders and document folders", () => {
    const names = (kind) => sample.folders.filter((f) => f.kind === kind && !f.parentId).map((f) => f.name);
    expect(names("note")).toEqual(["Work", "Personal", "Recipes"]);
    expect(names("doc")).toEqual(["ID cards", "Bills", "Receipts"]);
    const subFolders = sample.folders.filter((f) => f.parentId);
    expect(subFolders.length).toBeGreaterThan(0);
    for (const sub of subFolders) expect(byId.get(sub.parentId).kind).toBe(sub.kind);
  });

  it("puts 8-10 notes in note folders and 4-6 documents in document folders", () => {
    expect(sample.notes.length).toBeGreaterThanOrEqual(8);
    expect(sample.notes.length).toBeLessThanOrEqual(10);
    expect(sample.docs.length).toBeGreaterThanOrEqual(4);
    expect(sample.docs.length).toBeLessThanOrEqual(6);
    for (const note of sample.notes) {
      expect(byId.get(note.folderId).kind).toBe("note");
      expect(note.title.length).toBeGreaterThan(0);
      expect(note.body.length).toBeGreaterThan(20);
      expect(note.updatedAt).toBeLessThanOrEqual(NOW);
    }
    for (const doc of sample.docs) expect(byId.get(doc.folderId).kind).toBe("doc");
  });

  it("gives every document a matching file of the right type and size", () => {
    expect(sample.files.map((f) => f.id)).toEqual(sample.docs.map((d) => d.id));
    sample.docs.forEach((doc, i) => {
      const { blob } = sample.files[i];
      expect(["application/pdf", "image/png"]).toContain(doc.type);
      expect(blob.type).toBe(doc.type);
      expect(doc.size).toBe(blob.size);
      expect(doc.name.endsWith(doc.type === "image/png" ? ".png" : ".pdf")).toBe(true);
    });
  });

  it("uses fresh ids every time", () => {
    const again = buildSampleData({ createId, now: NOW });
    const first = new Set([...sample.folders, ...sample.notes, ...sample.docs].map((r) => r.id));
    for (const r of [...again.folders, ...again.notes, ...again.docs]) expect(first.has(r.id)).toBe(false);
  });

  it("survives a backup and restore round trip", async () => {
    const files = new Map(sample.files.map((f) => [f.id, f.blob]));
    const data = { folders: sample.folders, notes: sample.notes, docs: sample.docs };
    const { blob, missing } = await createBackup(data, async (id) => files.get(id));
    expect(missing).toBe(0);
    const parsed = parseBackup(await blob.text());
    expect(parsed.docs).toHaveLength(sample.docs.length);
    const merged = mergeBackup({ folders: [], notes: [], docs: [] }, parsed, createId);
    expect(merged.notes).toHaveLength(sample.notes.length);
    expect(merged.folders).toHaveLength(sample.folders.length);
  });
});

describe("addRecords", () => {
  it("keeps existing data and adds the new records", () => {
    const current = {
      folders: [{ id: "f", name: "Mine", kind: "note", parentId: null, createdAt: 1 }],
      notes: [{ id: "n", title: "Mine", body: "", pinned: false, folderId: "f", createdAt: 1, updatedAt: 1 }],
      docs: [],
    };
    const sample = buildSampleData({ createId, now: NOW });
    const next = addRecords(current, sample);
    expect(next.folders[0]).toBe(current.folders[0]);
    expect(next.folders).toHaveLength(1 + sample.folders.length);
    expect(next.notes.at(-1)).toBe(current.notes[0]);
    expect(next.notes).toHaveLength(1 + sample.notes.length);
    expect(next.docs).toHaveLength(sample.docs.length);
    expect(current.notes).toHaveLength(1); // not mutated
  });
});

describe("deleteAllData", () => {
  it("empties everything, including the Trash, and returns the file ids to delete", () => {
    const sample = buildSampleData({ createId, now: NOW });
    const trashedDoc = { ...sample.docs[0], deletedAt: NOW };
    const current = {
      folders: [...sample.folders, { id: "gone", name: "Old", kind: "note", parentId: null, createdAt: 1, deletedAt: NOW }],
      notes: sample.notes,
      docs: [trashedDoc, ...sample.docs.slice(1)],
    };
    const { data, fileIds } = deleteAllData(current);
    expect(data).toEqual({ folders: [], notes: [], docs: [] });
    expect(fileIds.sort()).toEqual(sample.docs.map((d) => d.id).sort());
  });

  it("works on empty data", () => {
    expect(deleteAllData({ folders: [], notes: [], docs: [] })).toEqual({
      data: { folders: [], notes: [], docs: [] },
      fileIds: [],
    });
  });
});
