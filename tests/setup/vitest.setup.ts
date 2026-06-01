import '@testing-library/jest-dom/vitest';

class ResizeObserverMock {
  observe() { void 0; }
  unobserve() { void 0; }
  disconnect() { void 0; }
}

globalThis.ResizeObserver = ResizeObserverMock;
