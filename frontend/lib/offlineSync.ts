import { addOutboxItem, getOutboxItems, OutboxItem, removeOutboxItem } from './idb';

const SYNC_TAG = 'sync-invoice-records';

function getToken(): string {
  return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
}

async function registerBackgroundSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const syncRegistration = registration as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    };
    if (syncRegistration.sync) {
      await syncRegistration.sync.register(SYNC_TAG);
      return true;
    }
  } catch {
    // Background Sync unsupported (e.g. Safari) - the online-event fallback below covers it.
  }
  return false;
}

async function postJson(apiUrl: string, accessToken: string, payload: unknown): Promise<Response> {
  return fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}

export type SubmitOutcome = 'sent' | 'queued';

// Tries to submit immediately; if the network is down (or the request
// fails), the record is queued in IndexedDB and retried via the Service
// Worker's Background Sync (or a plain 'online' listener where unsupported)
// per FR-11 - form submission itself is never lost to a dropped connection.
export async function submitOrQueue(apiUrl: string, payload: unknown): Promise<SubmitOutcome> {
  const accessToken = getToken();

  if (navigator.onLine) {
    try {
      const response = await postJson(apiUrl, accessToken, payload);
      if (response.ok) {
        return 'sent';
      }
      if (response.status >= 400 && response.status < 500) {
        const detail = await response.text();
        throw new Error(detail || `Request rejected (${response.status}).`);
      }
      // 5xx: fall through and queue for retry rather than surfacing a dead end.
    } catch (error) {
      if (error instanceof Error && error.name !== 'TypeError') {
        // A real application error (e.g. our own 4xx throw above) - don't queue, surface it.
        throw error;
      }
      // Network-level failure (fetch threw TypeError, or we're offline) - queue below.
    }
  }

  const item: OutboxItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
    apiUrl,
    accessToken,
    payload,
    attempts: 0,
  };
  await addOutboxItem(item);
  const synced = await registerBackgroundSync();
  if (!synced) {
    window.addEventListener('online', () => { flushOutbox(); }, { once: true });
  }
  return 'queued';
}

export async function flushOutbox(): Promise<void> {
  const items = await getOutboxItems();
  for (const item of items) {
    try {
      const response = await postJson(item.apiUrl, item.accessToken || getToken(), item.payload);
      if (response.ok) {
        await removeOutboxItem(item.id);
      }
    } catch {
      // Still offline or server unreachable - leave queued for the next attempt.
    }
  }
}

export async function getPendingOutboxCount(): Promise<number> {
  const items = await getOutboxItems();
  return items.length;
}

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // PWA install/offline support is a progressive enhancement - safe to ignore failures.
    });
  });
  window.addEventListener('online', () => { flushOutbox(); });
}
