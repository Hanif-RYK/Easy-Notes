import { canvasToPng, createCanvas, makePdf } from "./sampleFiles.js";

// Fictional example content so a new user (or a buyer of the source code)
// can see the app working straight away. Every name, number and address
// below is made up.

const DAY = 86_400_000;

const NOTE_FOLDERS = [
  { key: "work", name: "Work" },
  { key: "meetings", name: "Meetings", parent: "work" },
  { key: "projects", name: "Projects", parent: "work" },
  { key: "personal", name: "Personal" },
  { key: "travel", name: "Travel", parent: "personal" },
  { key: "recipes", name: "Recipes" },
  { key: "desserts", name: "Desserts", parent: "recipes" },
];

const DOC_FOLDERS = [
  { key: "ids", name: "ID cards" },
  { key: "bills", name: "Bills" },
  { key: "receipts", name: "Receipts" },
];

const NOTES = [
  {
    folder: "meetings",
    daysAgo: 1,
    pinned: true,
    title: "Weekly team meeting",
    body: "Attendees: Sara, Daniel, Mei, Omar\n\n- Website launch moved to the 24th\n- Daniel finishes the pricing page by Friday\n- Mei to collect feedback from the beta testers\n- Next meeting: Monday 10:00\n\nAction: send the updated timeline to everyone today.",
  },
  {
    folder: "meetings",
    daysAgo: 6,
    title: "Call with Northwind Supplies",
    body: "They can deliver the new desks in 3 weeks.\nPrice: 4 desks, including assembly.\nAsk for a written quote and the warranty terms before we confirm.",
  },
  {
    folder: "projects",
    daysAgo: 2,
    title: "Website redesign — plan",
    body: "1. Collect the content for every page\n2. New photos for the team page\n3. Make the contact form shorter (name, email, message)\n4. Test on phones before launch\n\nGoal: a faster, simpler site that is easy to update.",
  },
  {
    folder: "work",
    daysAgo: 3,
    title: "Ideas for the newsletter",
    body: "- Short customer story each month\n- \"Tip of the month\" section\n- Photos from the office\n- Keep it under 300 words",
  },
  {
    folder: "personal",
    daysAgo: 0,
    pinned: true,
    title: "Shopping list",
    body: "Milk\nEggs\nWholegrain bread\nTomatoes\nRice (5 kg)\nOlive oil\nWashing-up liquid",
  },
  {
    folder: "personal",
    daysAgo: 4,
    title: "Books to read",
    body: "- The Quiet Garden\n- Notes from a Small Kitchen\n- A Short History of Maps\n\nAsk at the library about the waiting list.",
  },
  {
    folder: "travel",
    daysAgo: 8,
    title: "Weekend trip checklist",
    body: "Train tickets (Saturday 08:15)\nHotel booking printed\nPhone charger + power bank\nRain jacket\nCamera\nWater the plants before leaving",
  },
  {
    folder: "recipes",
    daysAgo: 5,
    title: "Lentil soup",
    body: "Serves 4\n\n1 onion, 2 carrots, 2 garlic cloves\n250 g red lentils\n1.2 l vegetable stock\n1 tsp cumin, salt, pepper, lemon juice\n\nFry the onion, carrots and garlic for 5 minutes. Add the lentils, stock and cumin. Simmer for 20 minutes, blend, then finish with lemon juice.",
  },
  {
    folder: "desserts",
    daysAgo: 9,
    title: "Banana bread",
    body: "3 ripe bananas\n75 g melted butter\n150 g sugar\n1 egg\n1 tsp baking soda\n190 g flour\n\nMix everything, pour into a loaf tin and bake at 175 °C for 55–60 minutes.",
  },
];

// ---- Generated documents -----------------------------------------------------

const PALETTE = ["#ffffff", "#0f172a", "#4f46e5", "#e0e7ff", "#64748b", "#f59e0b", "#e2e8f0", "#10b981"];
const [WHITE, INK, INDIGO, INDIGO_LIGHT, GREY, AMBER, LINE, GREEN] = PALETTE.map((_, i) => i);

function idCardImage() {
  const c = createCanvas(320, 200, PALETTE);
  c.rect(0, 0, 320, 200, INDIGO_LIGHT);
  c.rect(0, 0, 320, 40, INDIGO);
  c.text(14, 13, "CITY LIBRARY CARD", WHITE);
  c.rect(18, 58, 78, 96, WHITE);
  c.circle(57, 90, 18, GREY);
  c.rect(33, 112, 48, 34, GREY);
  c.text(112, 62, "NAME", GREY, 1);
  c.text(112, 74, "ALEX MORGAN", INK);
  c.text(112, 100, "MEMBER NO", GREY, 1);
  c.text(112, 112, "LIB-204817", INK);
  c.text(112, 138, "VALID UNTIL", GREY, 1);
  c.text(112, 150, "12/2027", INK);
  for (let x = 18; x < 300; x += 6) c.rect(x, 172, x % 4 ? 2 : 3, 16, INK); // barcode
  return canvasToPng(c);
}

function gymCardImage() {
  const c = createCanvas(320, 200, PALETTE);
  c.rect(0, 0, 320, 200, INK);
  c.rect(0, 150, 320, 50, GREEN);
  c.text(16, 18, "FITLIFE GYM", WHITE, 3);
  c.text(16, 66, "MEMBER", GREY, 1);
  c.text(16, 78, "ALEX MORGAN", WHITE);
  c.text(16, 104, "ID # 7731 0042", WHITE);
  c.text(16, 166, "ACCESS: ALL CLUBS", INK);
  return canvasToPng(c);
}

function groceryReceiptImage() {
  const c = createCanvas(200, 300, PALETTE);
  c.rect(0, 0, 200, 300, WHITE);
  c.text(34, 14, "GREEN MARKET", INK);
  c.text(52, 34, "STORE 112", GREY, 1);
  c.rect(10, 50, 180, 1, LINE);
  const items = [
    ["MILK", "1.20"],
    ["EGGS X12", "3.40"],
    ["BREAD", "2.10"],
    ["TOMATOES", "2.75"],
    ["RICE 5KG", "8.90"],
    ["OLIVE OIL", "6.45"],
  ];
  items.forEach(([name, price], i) => {
    c.text(12, 62 + i * 22, name, INK);
    c.text(140, 62 + i * 22, price, INK);
  });
  c.rect(10, 200, 180, 1, LINE);
  c.text(12, 212, "TOTAL", INK);
  c.text(128, 212, "$24.80", INDIGO);
  c.text(12, 240, "PAID: CARD", GREY);
  c.text(12, 262, "THANK YOU", AMBER);
  return canvasToPng(c);
}

const DOCS = [
  { folder: "ids", name: "Library card.png", daysAgo: 20, make: idCardImage },
  { folder: "ids", name: "Gym membership card.png", daysAgo: 35, make: gymCardImage },
  {
    folder: "bills",
    name: "Electricity bill — October.pdf",
    daysAgo: 7,
    pinned: true,
    make: () =>
      makePdf("Brightline Energy", [
        { text: "Electricity bill", bold: true, size: 13 },
        "Customer: Alex Morgan",
        "Account no: 4410-7782-09",
        "Billing period: 1 Oct - 31 Oct",
        { text: "Usage: 212 kWh", gap: 28 },
        "Energy charge: 38.16",
        "Standing charge: 7.50",
        { text: "Total due: 45.66", bold: true, size: 13, gap: 26 },
        "Due date: 20 November",
        { text: "This is a sample document created by Easy Notes.", size: 9, gap: 40 },
      ]),
  },
  {
    folder: "bills",
    name: "Internet bill — October.pdf",
    daysAgo: 12,
    make: () =>
      makePdf("SkyNet Broadband", [
        { text: "Monthly statement", bold: true, size: 13 },
        "Customer: Alex Morgan",
        "Plan: Fibre 100",
        "Period: October",
        { text: "Monthly fee: 29.99", gap: 28 },
        { text: "Total due: 29.99", bold: true, size: 13, gap: 26 },
        "Paid automatically on 15 November",
        { text: "This is a sample document created by Easy Notes.", size: 9, gap: 40 },
      ]),
  },
  { folder: "receipts", name: "Grocery receipt.png", daysAgo: 2, make: groceryReceiptImage },
  {
    folder: "receipts",
    name: "Laptop repair receipt.pdf",
    daysAgo: 15,
    make: () =>
      makePdf("QuickFix Repairs", [
        { text: "Receipt #R-30918", bold: true, size: 13 },
        "Customer: Alex Morgan",
        "Device: 14-inch laptop",
        { text: "Keyboard replacement: 65.00", gap: 28 },
        "Labour: 20.00",
        { text: "Total paid: 85.00", bold: true, size: 13, gap: 26 },
        "Warranty: 90 days",
        { text: "This is a sample document created by Easy Notes.", size: 9, gap: 40 },
      ]),
  },
];

/**
 * Builds a fresh set of sample folders, notes and documents.
 * Returns { folders, notes, docs, files } where `files` is a list of
 * { id, blob } to store with the documents (same shape the app uses for uploads).
 */
export function buildSampleData({ createId, now = Date.now() }) {
  const folders = [];
  const ids = {};
  const addFolders = (list, kind) => {
    list.forEach((f, i) => {
      ids[f.key] = createId();
      folders.push({ id: ids[f.key], name: f.name, kind, parentId: f.parent ? ids[f.parent] : null, createdAt: now - (30 - i) * DAY });
    });
  };
  addFolders(NOTE_FOLDERS, "note");
  addFolders(DOC_FOLDERS, "doc");

  const notes = NOTES.map((n) => {
    const time = now - n.daysAgo * DAY;
    return { id: createId(), title: n.title, body: n.body, pinned: !!n.pinned, folderId: ids[n.folder], createdAt: time - DAY, updatedAt: time };
  });

  const docs = [];
  const files = [];
  for (const d of DOCS) {
    const id = createId();
    const blob = d.make();
    docs.push({ id, name: d.name, type: blob.type, size: blob.size, pinned: !!d.pinned, folderId: ids[d.folder], createdAt: now - d.daysAgo * DAY });
    files.push({ id, blob });
  }

  return { folders, notes, docs, files };
}

/** Adds sample (or any) records to the current data. */
export function addRecords(current, records) {
  return {
    folders: [...current.folders, ...records.folders],
    notes: [...records.notes, ...current.notes],
    docs: [...records.docs, ...current.docs],
  };
}

/**
 * Removes every folder, note and document, including the Trash.
 * Returns the empty data and the ids of document files to delete.
 */
export function deleteAllData(current) {
  return { data: { folders: [], notes: [], docs: [] }, fileIds: current.docs.map((d) => d.id) };
}
