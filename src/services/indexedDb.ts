import { EncryptedEnvelope } from '../types/vault';

const DB_NAME = 'KeepEitDB';
const DB_VERSION = 2;
const STORE_NAME = 'vaultStore';
const ENVELOPE_KEY = 'primary_envelope';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('envelope_store')) {
        db.createObjectStore('envelope_store');
      }
      if (!db.objectStoreNames.contains('vaultStore')) {
        db.createObjectStore('vaultStore');
      }
    };

    request.onsuccess = async () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const currentVersion = db.version;
        db.close();
        const upgradeReq = indexedDB.open(DB_NAME, currentVersion + 1);
        upgradeReq.onupgradeneeded = (e) => {
          const upgradedDb = (e.target as IDBOpenDBRequest).result;
          if (!upgradedDb.objectStoreNames.contains('envelope_store')) {
            upgradedDb.createObjectStore('envelope_store');
          }
          if (!upgradedDb.objectStoreNames.contains('vaultStore')) {
            upgradedDb.createObjectStore('vaultStore');
          }
        };
        upgradeReq.onsuccess = () => resolve(upgradeReq.result);
        upgradeReq.onerror = () => reject(upgradeReq.error);
      } else {
        resolve(db);
      }
    };

    request.onerror = () => {
      reject(new Error('Failed to open KeepEit IndexedDB storage.'));
    };
  });
}

/**
 * Retrieves the single encrypted envelope from IndexedDB
 */
export async function getStoredEnvelope(): Promise<EncryptedEnvelope | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(ENVELOPE_KEY);

    request.onsuccess = () => {
      resolve((request.result as EncryptedEnvelope) || null);
    };

    request.onerror = () => {
      reject(new Error('Error reading vault envelope from IndexedDB.'));
    };
  });
}

/**
 * Saves the single encrypted envelope to IndexedDB
 */
export async function saveStoredEnvelope(envelope: EncryptedEnvelope): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(envelope, ENVELOPE_KEY);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Error persisting encrypted envelope to IndexedDB.'));
    };
  });
}

/**
 * Wipes IndexedDB vault data completely
 */
export async function wipeStoredVault(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(ENVELOPE_KEY);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Error wiping IndexedDB storage.'));
    };
  });
}
