import { describe, expect, it } from "vitest";
import { formatSize, isImage, isPdf, preview } from "../format.js";

describe("format", () => {
  it("formats file sizes", () => {
    expect(formatSize(500)).toBe("500 B");
    expect(formatSize(2048)).toBe("2 KB");
    expect(formatSize(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });

  it("detects file types", () => {
    expect(isPdf("application/pdf")).toBe(true);
    expect(isImage("image/png")).toBe(true);
    expect(isImage("text/html")).toBe(false);
  });

  it("uses the first non-empty line as preview", () => {
    expect(preview("\n\n  First line \nSecond")).toBe("First line");
    expect(preview("")).toBe("No additional text");
  });
});
