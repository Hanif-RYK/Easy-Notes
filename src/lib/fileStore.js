// Document files (PDFs, images) are too large for localStorage, so the
// binary data lives in IndexedDB. Only small metadata goes to localStorage.

const DB_NAME = "easy-notes";
const STORE = "files";

let dbPromise;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    // Allow a retry later if opening failed (e.g. storage blocked).
    dbPromise.catch(() => {
      dbPromise = undefined;
    });
  }
  return dbPromise;
}

async function run(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const putFile = (id, blob) => run("readwrite", (store) => store.put(blob, id));
export const getFile = (id) => run("readonly", (store) => store.get(id));
export const deleteFile = (id) => run("readwrite", (store) => store.delete(id));
export const clearFiles = () => run("readwrite", (store) => store.clear());
