const DB_NAME = 'ocr-invoice-db';
const DB_VERSION = 1;
export const OUTBOX_STORE = 'outbox';

export type OutboxItem = {
  id: string;
  createdAt: number;
  apiUrl: string;
  accessToken: string;
  payload: unknown;
  attempts: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addOutboxItem(item: OutboxItem): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    tx.objectStore(OUTBOX_STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getOutboxItems(): Promise<OutboxItem[]> {
  const db = await openDb();
  const items = await new Promise<OutboxItem[]>((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readonly');
    const request = tx.objectStore(OUTBOX_STORE).getAll();
    request.onsuccess = () => resolve(request.result as OutboxItem[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return items;
}

export async function removeOutboxItem(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    tx.objectStore(OUTBOX_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
