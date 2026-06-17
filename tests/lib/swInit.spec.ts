import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerServiceWorker } from '../../src/swInit';

describe('registerServiceWorker', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('attaches a load listener when serviceWorker is supported', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: vi.fn().mockResolvedValue({}) },
      configurable: true,
    });
    registerServiceWorker();
    expect(addEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function));
  });

  it('registers /sw.js with scope "/" when load fires', async () => {
    const registerMock = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerMock },
      configurable: true,
    });
    registerServiceWorker();
    // Trigger the load event
    window.dispatchEvent(new Event('load'));
    await Promise.resolve();
    expect(registerMock).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('does not throw when registration rejects', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const registerMock = vi.fn().mockRejectedValue(new Error('SW unavailable'));
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerMock },
      configurable: true,
    });
    registerServiceWorker();
    window.dispatchEvent(new Event('load'));
    await Promise.resolve();
    await Promise.resolve(); // flush rejection
    // No uncaught error — test passes if we reach here
    expect(registerMock).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[APEX PWA] SW registration failed:', expect.any(Error));
  });

  it('skips registration when serviceWorker is not in navigator', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
    // Temporarily remove serviceWorker from navigator
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    });
    registerServiceWorker();
    expect(addEventListenerSpy).not.toHaveBeenCalled();
    // Restore
    if (original) Object.defineProperty(navigator, 'serviceWorker', original);
  });

  it('skips registration outside a browser window context', () => {
    vi.stubGlobal('window', undefined);

    registerServiceWorker();

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });
});
