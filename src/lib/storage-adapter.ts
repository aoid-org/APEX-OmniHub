/**
 * Storage adapter abstraction layer
 * Allows swapping underlying storage mechanisms (localStorage, IndexedDB, etc.)
 */

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      if (this.isQuotaExceededError(error)) {
        console.warn('Storage quota exceeded, failed to write to localStorage');
        // Potential fallback or cleanup strategy could go here
      }
      // Non-fatal, just swallow other errors or log in dev
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Non-fatal
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // Non-fatal
    }
  }

  private isQuotaExceededError(e: unknown): boolean {
    return (
      e instanceof DOMException &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === 'QuotaExceededError' ||
        // Firefox
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
      // acknowledge QuotaExceededError only if there's something already stored
      localStorage.length !== 0
    );
  }
}

export const defaultStorage = new LocalStorageAdapter();
