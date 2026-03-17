import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupNotificationClickHandler } from '../../src/lib/push-notifications';
import * as monitoring from '../../src/lib/monitoring';

// Manual mock for monitoring
const logAnalyticsEventSpy = vi.spyOn(monitoring, 'logAnalyticsEvent').mockImplementation(() => Promise.resolve());

/**
 * Mock ServiceWorker class for instanceof checks in tests
 */
class MockServiceWorker {
  // Empty class implementation for mocking purposes
}

describe('setupNotificationClickHandler', () => {
  let messageHandler: ((event: { origin: string; data: unknown; source: unknown }) => void) | null = null;
  const originalLocation = globalThis.location;
  const originalServiceWorker = (globalThis as unknown as { ServiceWorker: unknown }).ServiceWorker;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    messageHandler = null;
    logAnalyticsEventSpy.mockClear();

    // Mock navigator.serviceWorker
    const mockServiceWorkerContainer = {
      addEventListener: vi.fn((type: string, handler: (event: { origin: string; data: unknown; source: unknown }) => void) => {
        if (type === 'message') {
          messageHandler = handler;
        }
      }),
      removeEventListener: vi.fn(),
    };

    // Use Object.defineProperty to bypass read-only issues
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        ...originalNavigator,
        serviceWorker: mockServiceWorkerContainer,
      },
    });

    // Mock location.origin
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        origin: 'https://app.omnilink.com',
        href: 'https://app.omnilink.com',
      },
    });

    // Mock ServiceWorker global
    Object.defineProperty(globalThis, 'ServiceWorker', {
      configurable: true,
      value: MockServiceWorker,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'location', { value: originalLocation, configurable: true });
    Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true });
    Object.defineProperty(globalThis, 'ServiceWorker', { value: originalServiceWorker, configurable: true });
  });

  it('should register a message listener on service worker', () => {
    setupNotificationClickHandler();
    expect(navigator.serviceWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('should accept messages from matching origin', () => {
    setupNotificationClickHandler();
    if (!messageHandler) throw new Error('Handler not registered');

    const event = {
      origin: 'https://app.omnilink.com',
      data: { type: 'notification-click', action: 'open-dash' },
      source: null,
    };

    messageHandler(event);
    expect(logAnalyticsEventSpy).toHaveBeenCalledWith('push.notification.clicked', expect.any(Object));
    expect(globalThis.location.href).toBe('/omnidash');
  });

  it('should accept messages from empty origin if source is ServiceWorker', () => {
    setupNotificationClickHandler();
    if (!messageHandler) throw new Error('Handler not registered');

    // Create a mock ServiceWorker instance
    const ServiceWorkerClass = (globalThis as unknown as { ServiceWorker: new () => ServiceWorker }).ServiceWorker;
    const mockSW = new ServiceWorkerClass();

    const event = {
      origin: '',
      data: { type: 'notification-click', action: 'open-trace' },
      source: mockSW,
    };

    messageHandler(event);
    expect(logAnalyticsEventSpy).toHaveBeenCalledWith('push.notification.clicked', expect.any(Object));
    expect(globalThis.location.href).toBe('/omnitrace');
  });

  it('should accept messages from "null" origin if source is ServiceWorker', () => {
    setupNotificationClickHandler();
    if (!messageHandler) throw new Error('Handler not registered');

    const ServiceWorkerClass = (globalThis as unknown as { ServiceWorker: new () => ServiceWorker }).ServiceWorker;
    const mockSW = new ServiceWorkerClass();

    const event = {
      origin: 'null',
      data: { type: 'notification-click', action: 'open-integrations' },
      source: mockSW,
    };

    messageHandler(event);
    expect(logAnalyticsEventSpy).toHaveBeenCalledWith('push.notification.clicked', expect.any(Object));
    expect(globalThis.location.href).toBe('/integrations');
  });

  it('should accept messages from empty origin if source has scriptURL (fallback)', () => {
    setupNotificationClickHandler();
    if (!messageHandler) throw new Error('Handler not registered');

    const event = {
      origin: '',
      data: { type: 'notification-click', action: 'custom', data: { url: '/settings' } },
      source: { scriptURL: 'https://app.omnilink.com/sw.js' },
    };

    messageHandler(event);
    expect(logAnalyticsEventSpy).toHaveBeenCalledWith('push.notification.clicked', expect.any(Object));
    expect(globalThis.location.href).toBe('/settings');
  });

  it('should reject messages from untrusted origins', () => {
    setupNotificationClickHandler();
    if (!messageHandler) throw new Error('Handler not registered');

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const event = {
      origin: 'https://malicious.com',
      data: { type: 'notification-click', action: 'open-dash' },
      source: null,
    };

    messageHandler(event);
    expect(logAnalyticsEventSpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('[Push] Rejected message from untrusted origin:', 'https://malicious.com');
  });

  it('should reject messages from empty origin if source is NOT a ServiceWorker', () => {
    setupNotificationClickHandler();
    if (!messageHandler) throw new Error('Handler not registered');

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const event = {
      origin: '',
      data: { type: 'notification-click', action: 'open-dash' },
      source: { notA: 'ServiceWorker' },
    };

    messageHandler(event);
    expect(logAnalyticsEventSpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
  });
});
