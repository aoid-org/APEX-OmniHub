// Native IndexedDB Wrapper for Zero-Cost Client-Side Blob Storage
export const DB_NAME = 'ApexOmniHubFiles';
export const STORE_NAME = 'local_files';

export interface LocalFileRecord {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  timestamp: number;
}

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalFile(file: File): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Create a stable local record preserving the literal File blob
    const record: LocalFileRecord = { 
      id: `${Date.now()}-${file.name.replaceAll(/[^a-zA-Z0-9.\-_]/g, '_')}`, 
      file, 
      name: file.name, 
      size: file.size, 
      type: file.type, 
      timestamp: Date.now() 
    };
    
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function listLocalFiles(): Promise<LocalFileRecord[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
