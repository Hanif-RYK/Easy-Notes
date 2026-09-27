// All app data lives in IndexedDB:
//   files   – document binaries (PDFs, images), keyed by document id
//   notes, docs, folders – one record per item, keyed by `id`
// IndexedDB has far more room than localStorage and lets us write only the
// records that changed.

const DB_NAME = "easy-notes";
const DB_VERSION = 2;
export const STORES = ["notes", "docs", "folders"];

let dbPromise;
let onBlocked = () => {};

/**
 * Called when opening the database has to wait because an older version of
 * the app is still open in another tab. Opening continues by itself as soon
 * as that tab is closed.
 */
export function setBlockedHandler(fn) {
  onBlocked = fn;
}

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (event.oldVersion < 1) db.createObjectStore("files");
        if (event.oldVersion < 2) for (const name of STORES) db.createObjectStore(name, { keyPath: "id" });
      };
      request.onsuccess = () => {
        const db = request.result;
        // A newer version of the app wants to upgrade the database (e.g. in
        // another tab): close ours so it isn't blocked; we reopen on next use.
        db.onversionchange = () => {
          db.close();
          dbPromise = undefined;
        };
        db.onclose = () => {
          dbPromise = undefined;
        };
        resolve(db);
      };
      request.onerror = () => reject(request.error);
      // Don't fail: keep waiting, and let the app tell the user what to do.
      request.onblocked = () => onBlocked();
    });
    // Allow a retry later if opening failed (e.g. storage blocked).
    dbPromise.catch(() => {
      dbPromise = undefined;
    });
  }
  return dbPromise;
}

/** Runs `work(tx)` in one transaction and resolves when it has committed. */
async function transaction(storeNames, mode, work) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    result = work(tx);
  });
}

const request = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

// ---- Records ---------------------------------------------------------------

export async function loadAll() {
  const db = await openDb();
  const tx = db.transaction(STORES, "readonly");
  const [notes, docs, folders] = await Promise.all(STORES.map((s) => request(tx.objectStore(s).getAll())));
  return { notes, docs, folders };
}

/**
 * Applies several changes atomically.
 * `changes` = { notes?: { put?: [], del?: [] }, docs?: ..., folders?: ... }
 */
export function writeChanges(changes) {
  const names = STORES.filter((s) => changes[s]);
  if (names.length === 0) return Promise.resolve();
  return transaction(names, "readwrite", (tx) => {
    for (const name of names) {
      const store = tx.objectStore(name);
      for (const record of changes[name].put ?? []) store.put(record);
      for (const id of changes[name].del ?? []) store.delete(id);
    }
  });
}

// ---- Files -----------------------------------------------------------------

export const putFile = (id, blob) => transaction("files", "readwrite", (tx) => tx.objectStore("files").put(blob, id));
export const deleteFile = (id) => transaction("files", "readwrite", (tx) => tx.objectStore("files").delete(id));

export async function getFile(id) {
  const db = await openDb();
  return request(db.transaction("files", "readonly").objectStore("files").get(id));
}
