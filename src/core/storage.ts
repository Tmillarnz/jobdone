import { migrateJob } from './migrations';
import type { Job, Quote, Settings } from './types';

const DB_VERSION = 1;
const STORES = ['jobs', 'quotes', 'kv', 'photos'] as const;
type StoreName = (typeof STORES)[number];

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export interface Storage {
  getSettings(): Promise<Settings | undefined>;
  saveSettings(s: Settings): Promise<void>;
  listJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  saveJob(job: Job): Promise<void>;
  deleteJob(id: string): Promise<void>;
  listQuotes(): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  saveQuote(q: Quote): Promise<void>;
  /** Next sequence number for a day (YYYYMMDD), starting at 1. Atomic. */
  nextQuoteSeq(dayKey: string): Promise<number>;
  putPhoto(id: string, blob: Blob): Promise<void>;
  getPhoto(id: string): Promise<Blob | undefined>;
  deletePhoto(id: string): Promise<void>;
  close(): void;
}

export async function openStorage(name = 'utedesk'): Promise<Storage> {
  const open = indexedDB.open(name, DB_VERSION);
  open.onupgradeneeded = () => {
    const db = open.result;
    // Stores are only ever added here. Record shapes change through
    // schemaVersion and migrations.ts, not through DB_VERSION.
    if (!db.objectStoreNames.contains('jobs')) db.createObjectStore('jobs', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('quotes')) db.createObjectStore('quotes', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos');
  };
  const db = await req(open);

  const store = (n: StoreName, mode: IDBTransactionMode = 'readonly') => db.transaction(n, mode).objectStore(n);
  const write = async (n: StoreName, fn: (s: IDBObjectStore) => void) => {
    const tx = db.transaction(n, 'readwrite');
    fn(tx.objectStore(n));
    await done(tx);
  };

  return {
    getSettings: () => req(store('kv').get('settings')) as Promise<Settings | undefined>,
    saveSettings: (s) => write('kv', (st) => st.put(s, 'settings')),

    async listJobs() {
      const raw = (await req(store('jobs').getAll())) as unknown[];
      return raw.map((r) => migrateJob(r)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async getJob(id) {
      const raw = await req(store('jobs').get(id));
      return raw ? migrateJob(raw) : undefined;
    },
    saveJob: (job) => write('jobs', (st) => st.put(job)),
    deleteJob: (id) => write('jobs', (st) => st.delete(id)),

    async listQuotes() {
      const all = (await req(store('quotes').getAll())) as Quote[];
      return all.sort((a, b) => b.number.localeCompare(a.number));
    },
    getQuote: (id) => req(store('quotes').get(id)) as Promise<Quote | undefined>,
    saveQuote: (q) => write('quotes', (st) => st.put(q)),

    async nextQuoteSeq(dayKey) {
      // Read and write in one transaction so two confirms cannot share a number.
      const tx = db.transaction('kv', 'readwrite');
      const st = tx.objectStore('kv');
      const key = `quoteSeq:${dayKey}`;
      const current = ((await req(st.get(key))) as number | undefined) ?? 0;
      const next = current + 1;
      st.put(next, key);
      await done(tx);
      return next;
    },

    putPhoto: (id, blob) => write('photos', (st) => st.put(blob, id)),
    getPhoto: (id) => req(store('photos').get(id)) as Promise<Blob | undefined>,
    deletePhoto: (id) => write('photos', (st) => st.delete(id)),
    close: () => db.close(),
  };
}
