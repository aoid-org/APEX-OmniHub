import { vi } from 'vitest';

/**
 * Simple localStorage mock that implements the Storage interface
 */
export const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() { return Object.keys(store).length; },
  };
})() as unknown as Storage;

/**
 * Initialize environment for Bun and Vitest compatibility
 */
export function setupMonitoringTestEnv(): void {
  const globalObj = globalThis as unknown as Record<string, unknown>;

  if (typeof localStorage === 'undefined') {
    globalObj.localStorage = localStorageMock;
  }

  if (typeof StorageEvent === 'undefined') {
    globalObj.StorageEvent = class StorageEvent extends Event {
      key: string | null;
      newValue: string | null;
      storageArea: Storage | null;
      constructor(type: string, eventInitDict?: StorageEventInit) {
        super(type, eventInitDict);
        this.key = eventInitDict?.key || null;
        this.newValue = eventInitDict?.newValue || null;
        this.storageArea = eventInitDict?.storageArea || null;
      }
    };
  }

  if (typeof window === 'undefined') {
    globalObj.window = globalThis;
  }

  if (typeof document === 'undefined') {
    globalObj.document = {
      visibilityState: 'visible',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as Document;
  }
}
