// Tiny PDF and PNG files made in code for the sample data, so no image or
// PDF files have to ship with the app. Both builders return a Blob.

// ---- PDF ---------------------------------------------------------------------

// Built-in PDF fonts only cover plain ASCII here, so anything else becomes "-".
const pdfEscape = (text) =>
  text.replace(/[^\x20-\x7e]/g, "-").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

/**
 * One-page A5 PDF with a title and lines of text (Helvetica, which every PDF
 * reader has built in). `lines` items are strings or { text, bold, size, gap }.
 */
export function makePdf(title, lines) {
  const ops = ["BT", "/F2 18 Tf", "48 540 Td", `(${pdfEscape(title)}) Tj`, "0 -14 Td"];
  for (const line of lines) {
    const { text, bold = false, size = 11, gap = 18 } = typeof line === "string" ? { text: line } : line;
    ops.push(`0 -${gap} Td`, `/${bold ? "F2" : "F1"} ${size} Tf`, `(${pdfEscape(text)}) Tj`);
  }
  ops.push("ET", "0.31 0.27 0.9 RG 2 w 48 528 m 372 528 l S");
  const content = ops.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 595] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([pdf], { type: "application/pdf" });
}

// ---- PNG ---------------------------------------------------------------------

// 5×7 pixel font for the characters the sample images use.
const GLYPHS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

/** Small drawing surface with a colour palette (index 0 is the background). */
export function createCanvas(width, height, palette) {
  const pixels = new Uint8Array(width * height);
  const set = (x, y, c) => {
    if (x >= 0 && y >= 0 && x < width && y < height) pixels[y * width + x] = c;
  };
  return {
    width,
    height,
    palette,
    pixels,
    rect(x, y, w, h, c) {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c);
    },
    circle(cx, cy, r, c) {
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) set(cx + i, cy + j, c);
    },
    text(x, y, str, c, scale = 2) {
      let cx = x;
      for (const ch of str.toUpperCase()) {
        const glyph = GLYPHS[ch] ?? GLYPHS[" "];
        glyph.forEach((row, gy) => {
          for (let gx = 0; gx < 5; gx++) if (row[gx] === "1") this.rect(cx + gx * scale, y + gy * scale, scale, scale, c);
        });
        cx += 6 * scale;
      }
    },
  };
}

let crcTable;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of bytes) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

function chunk(type, data) {
  const typed = [...type].map((ch) => ch.charCodeAt(0));
  const body = new Uint8Array([...typed, ...data]);
  return [...u32(data.length), ...body, ...u32(crc32(body))];
}

/** zlib stream using uncompressed ("stored") blocks — tiny code, no library needed. */
function zlibStored(data) {
  const out = [0x78, 0x01];
  let i = 0;
  do {
    const block = data.subarray(i, i + 65535);
    i += 65535;
    const len = block.length;
    out.push(i >= data.length ? 1 : 0, len & 255, len >> 8, ~len & 255, (~len >> 8) & 255);
    for (const byte of block) out.push(byte);
  } while (i < data.length);
  let a = 1;
  let b = 0;
  for (const byte of data) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  out.push(...u32(((b << 16) | a) >>> 0));
  return out;
}

/** Encodes a canvas from createCanvas() as an 8-bit palette PNG. */
export function canvasToPng(canvas) {
  const { width, height, palette, pixels } = canvas;
  const raw = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0; // filter: none
    raw.set(pixels.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  }
  const plte = palette.flatMap((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  const bytes = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk("IHDR", [...u32(width), ...u32(height), 8, 3, 0, 0, 0]),
    ...chunk("PLTE", plte),
    ...chunk("IDAT", zlibStored(raw)),
    ...chunk("IEND", []),
  ];
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}
