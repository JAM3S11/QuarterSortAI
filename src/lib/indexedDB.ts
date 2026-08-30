import { ScannedFile, USBVolumeInfo, AIInsightReport } from '../types';

const DB_NAME = 'QuarterSortDB';
const DB_VERSION = 1;
const STORE_FILES = 'scanned_files';
const STORE_VOLUME = 'volume_info';
const STORE_AI = 'ai_insights';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        const fileStore = db.createObjectStore(STORE_FILES, { keyPath: 'id' });
        fileStore.createIndex('path', 'path', { unique: true });
        fileStore.createIndex('folderPath', 'folderPath', { unique: false });
        fileStore.createIndex('quarter', 'classification.quarter', { unique: false });
        fileStore.createIndex('category', 'category', { unique: false });
        fileStore.createIndex('sha256', 'sha256', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_VOLUME)) {
        db.createObjectStore(STORE_VOLUME, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_AI)) {
        db.createObjectStore(STORE_AI, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveScannedIndexToDB(files: ScannedFile[], volumeInfo: USBVolumeInfo): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_FILES, STORE_VOLUME], 'readwrite');
    const fileStore = tx.objectStore(STORE_FILES);
    const volStore = tx.objectStore(STORE_VOLUME);

    // Clear existing
    fileStore.clear();
    volStore.clear();

    // Store files
    for (const file of files) {
      // Remove non-serializable DOM handles before saving
      const serializableFile = { ...file, handle: undefined };
      fileStore.put(serializableFile);
    }

    // Store volume info
    volStore.put({ id: 'current_volume', ...volumeInfo });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save skipped:', err);
  }
}

export async function loadScannedIndexFromDB(): Promise<{ files: ScannedFile[]; volumeInfo: USBVolumeInfo | null } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_FILES, STORE_VOLUME], 'readonly');
    const fileStore = tx.objectStore(STORE_FILES);
    const volStore = tx.objectStore(STORE_VOLUME);

    const filesReq = fileStore.getAll();
    const volReq = volStore.get('current_volume');

    return new Promise((resolve) => {
      tx.oncomplete = () => {
        const rawFiles = filesReq.result || [];
        const vol = volReq.result || null;
        if (rawFiles.length === 0) {
          resolve(null);
          return;
        }

        // Restore Dates
        const files: ScannedFile[] = rawFiles.map((f: any) => ({
          ...f,
          createdDate: new Date(f.createdDate),
          modifiedDate: new Date(f.modifiedDate),
        }));

        const volumeInfo = vol ? {
          ...vol,
          lastScanTimestamp: vol.lastScanTimestamp ? new Date(vol.lastScanTimestamp) : null,
        } : null;

        resolve({ files, volumeInfo });
      };

      tx.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IndexedDB load failed:', err);
    return null;
  }
}

export async function saveAIInsightsToDB(insights: AIInsightReport): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_AI], 'readwrite');
    tx.objectStore(STORE_AI).put({ id: 'latest_insight', ...insights });
  } catch (e) {
    console.warn('Save AI insights failed', e);
  }
}

export async function clearScannedIndexFromDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_FILES, STORE_VOLUME], 'readwrite');
    tx.objectStore(STORE_FILES).clear();
    tx.objectStore(STORE_VOLUME).clear();
  } catch (e) {
    console.warn('IndexedDB clear failed', e);
  }
}

export async function loadAIInsightsFromDB(): Promise<AIInsightReport | null> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_AI], 'readonly');
    const req = tx.objectStore(STORE_AI).get('latest_insight');
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}
