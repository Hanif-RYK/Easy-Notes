import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { deleteFile, getFile, putFile } from "../db.js";

describe("document files", () => {
  it("stores a file and reads it back as a Blob", async () => {
    await putFile("doc-1", new Blob(["hello"], { type: "application/pdf" }));
    const blob = await getFile("doc-1");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(await blob.text()).toBe("hello");
    await deleteFile("doc-1");
    expect(await getFile("doc-1")).toBeUndefined();
  });
});
