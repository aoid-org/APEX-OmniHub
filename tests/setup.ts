/**
 * Vitest Test Setup
 * 
 * This file runs BEFORE all tests and sets up the test environment.
 * Polyfills crypto APIs not available in jsdom, and handles test isolation.
 */

// CRITICAL: Import webcrypto FIRST, before anything else
import { webcrypto } from 'node:crypto';

// Polyfill crypto for Node.js test environment (jsdom doesn't include full Web Crypto API)
// This MUST happen before any other imports that might use crypto
if (globalThis.crypto === undefined) {
  // @ts-expect-error - webcrypto is compatible with Crypto interface
  globalThis.crypto = webcrypto;
} else {
  // Even if crypto exists, ensure subtle is available AND fully functional (JSDOM often has stubbed subtle)
  if (globalThis.crypto.subtle === undefined || typeof globalThis.crypto.subtle.generateKey !== 'function') {
    // @ts-expect-error - webcrypto.subtle is compatible
    globalThis.crypto.subtle = webcrypto.subtle;
  }
  // Ensure randomUUID is available
  if (typeof globalThis.crypto.randomUUID !== 'function') {
    globalThis.crypto.randomUUID = webcrypto.randomUUID.bind(webcrypto);
  }
  // Ensure getRandomValues is available
  if (typeof globalThis.crypto.getRandomValues !== 'function') {
    // @ts-expect-error - adding method
    globalThis.crypto.getRandomValues = webcrypto.getRandomValues.bind(webcrypto);
  }
}

// Now import testing library
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Polyfill window.addEventListener for tests that need it (some jsdom versions are missing it)
if (globalThis.window !== undefined) {
  const originalAddEventListener = globalThis.window.addEventListener;

  // Only polyfill if not already a function
  if (typeof originalAddEventListener !== 'function') {
    const listeners: Map<string, Set<EventListenerOrEventListenerObject>> = new Map();

    globalThis.window.addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject
    ) => {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type)!.add(listener);
    };

    globalThis.window.removeEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject
    ) => {
      listeners.get(type)?.delete(listener);
    };

    globalThis.window.dispatchEvent = (event: Event) => {
      const eventListeners = listeners.get(event.type);
      if (eventListeners) {
        eventListeners.forEach((listener) => {
          if (typeof listener === 'function') {
            listener(event);
          } else {
            listener.handleEvent(event);
          }
        });
      }
      return true;
    };
  }
}

// CRITICAL: Clean up React Testing Library between tests to prevent
// "Should not already be working" errors caused by React concurrent rendering
afterEach(() => {
  // cleanup() is handled automatically by @testing-library/react
  // We avoid manual cleanup to prevent "Should not already be working" race conditions

  
  // Also clear the DOM body as a fallback
  if (typeof document !== 'undefined' && document.body) {
    document.body.innerHTML = '';
  }
});
