import { vi } from 'vitest';

// Simple localStorage mock
export const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

// Initialize environment for Bun
export function setupMonitoringTestEnv() {
  if (typeof localStorage === 'undefined') {
    (globalThis as any).localStorage = localStorageMock;
  }

  if (typeof StorageEvent === 'undefined') {
    (globalThis as any).StorageEvent = class StorageEvent extends Event {
      key: string | null;
      newValue: string | null;
      storageArea: Storage | null;
      constructor(type: string, eventInitDict?: any) {
        super(type, eventInitDict);
        this.key = eventInitDict?.key || null;
        this.newValue = eventInitDict?.newValue || null;
        this.storageArea = eventInitDict?.storageArea || null;
      }
    };
  }

  if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
  }

  if (typeof document === 'undefined') {
    (globalThis as any).document = {
      visibilityState: 'visible',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  }
}
