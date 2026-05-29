import { vi } from 'vitest';

/**
 * In-memory storage for the localStorage mock
 */
const store: Record<string, string> = {};

/**
 * Simple localStorage mock that implements the Storage interface
 */
export const localStorageMock: Storage = {
  getItem: (key: string): string | null => store[key] || null,
  setItem: (key: string, value: string): void => {
    store[key] = value.toString();
  },
  removeItem: (key: string): void => {
    delete store[key];
  },
  clear: (): void => {
    Object.keys(store).forEach(key => delete store[key]);
  },
  key: (index: number): string | null => Object.keys(store)[index] || null,
  get length(): number {
    return Object.keys(store).length;
  },
};

/**
 * Interface for RequestIdleCallback deadline
 */
interface MockIdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
}

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

  if (globalThis.window === undefined) {
    globalObj.window = globalThis;
  }

  if (typeof document === 'undefined') {
    globalObj.document = {
      visibilityState: 'visible',
      addEventListener: vi.fn<(type: string, listener: EventListenerOrEventListenerObject) => void>(),
      removeEventListener: vi.fn<(type: string, listener: EventListenerOrEventListenerObject) => void>(),
      dispatchEvent: vi.fn<(event: Event) => boolean>(),
    } as unknown as Document;
  }

  if (typeof globalObj.requestIdleCallback !== 'function') {
    globalObj.requestIdleCallback = (cb: (deadline: MockIdleDeadline) => void) => {
      return setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 10 }), 0);
    };
    globalObj.cancelIdleCallback = (handle: number) => {
      clearTimeout(handle);
    };
  }
}
