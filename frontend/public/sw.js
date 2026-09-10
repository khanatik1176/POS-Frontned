// Minimal PWA service worker for the /ocr page:
//  - runtime cache-as-you-go so a previously visited page still loads offline
//  - Background Sync handling for queued invoice-record submissions (FR-8/FR-11)
const RUNTIME_CACHE = 'ocr-runtime-v1';
const DB_NAME = 'ocr-invoice-db';
const DB_VERSION = 1;
const OUTBOX_STORE = 'outbox';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;
  if (request.url.includes('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Promise.reject('offline-and-uncached'))),
  );
});

function openOutboxDb() {
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

function getAllOutboxItems(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readonly');
    const request = tx.objectStore(OUTBOX_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function deleteOutboxItem(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    tx.objectStore(OUTBOX_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function flushOutbox() {
  const db = await openOutboxDb();
  const items = await getAllOutboxItems(db);
  for (const item of items) {
    try {
      const response = await fetch(item.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(item.accessToken ? { Authorization: `Bearer ${item.accessToken}` } : {}),
        },
        body: JSON.stringify(item.payload),
      });
      if (response.ok) {
        await deleteOutboxItem(db, item.id);
      }
    } catch (err) {
      // Still offline - Background Sync will fire again on the next connectivity change.
    }
  }
  db.close();
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-invoice-records') {
    event.waitUntil(flushOutbox());
  }
});
