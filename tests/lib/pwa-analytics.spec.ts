import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
  trackPWAInstallPrompt,
  trackPWAInstalled,
  trackPWALaunch,
  trackServiceWorkerEvents,
  trackNetworkStatus,
  trackFeatureUsage,
  trackPWAUninstall,
  initializePWAAnalytics,
  optOutOfAnalytics,
  optInToAnalytics,
  hasOptedOutOfAnalytics
} from '../../src/lib/pwa-analytics';

// Setup basic mocks
const mockLogAnalyticsEvent = mock(async (_event: string, _properties?: Record<string, unknown>) => {});

// Override the actual implementation using Bun's mock
mock.module('../../src/lib/monitoring', () => ({
  logAnalyticsEvent: mockLogAnalyticsEvent,
}));

describe('PWA Analytics', () => {
  let addedEventListeners: Record<string, EventListener>;

  beforeEach(() => {
    mockLogAnalyticsEvent.mockClear();
    addedEventListeners = {};

    // Mock globalThis.addEventListener
    globalThis.addEventListener = mock((event: string, callback: EventListener) => {
      addedEventListeners[event] = callback;
    });

    // Mock matchMedia
    globalThis.matchMedia = mock((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: mock(), // Deprecated
      removeListener: mock(), // Deprecated
      addEventListener: mock(),
      removeEventListener: mock(),
      dispatchEvent: mock(),
    }));

    // Mock localStorage
    const store = new Map();
    globalThis.localStorage = {
      getItem: mock((key) => store.get(key) || null),
      setItem: mock((key, value) => store.set(key, String(value))),
      removeItem: mock((key) => store.delete(key)),
      clear: mock(() => store.clear()),
      length: 0,
      key: mock(() => null),
    } as unknown as Storage;

    // Mock navigator user agent
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        serviceWorker: {
          addEventListener: mock(),
          ready: Promise.resolve({
            addEventListener: mock(),
            installing: {
              addEventListener: mock(),
              state: 'installed'
            }
          }),
          getRegistrations: mock(() => Promise.resolve([{
            unregister: mock(() => Promise.resolve(true))
          }])),
          controller: {}
        }
      },
      writable: true,
      configurable: true,
    });

    // Mock window location
    Object.defineProperty(globalThis, 'location', {
      value: {
        search: ''
      },
      writable: true,
      configurable: true,
    });

    // Mock history
    Object.defineProperty(globalThis, 'history', {
      value: {
        pushState: mock(),
        replaceState: mock(),
        state: null,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Clear mocks
  });

  describe('detectPlatform via trackPWAInstalled', () => {
    it('detects iOS devices', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });

      trackPWAInstalled();
      addedEventListeners['appinstalled'](new Event('appinstalled'));

      expect(mockLogAnalyticsEvent).toHaveBeenCalled();
      const args = mockLogAnalyticsEvent.mock.calls[0];
      expect(args[0]).toBe('pwa.install.completed');
      expect(args[1].platform).toBe('ios');
    });

    it('detects Android devices', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 11; SM-G991B)',
        configurable: true
      });

      trackPWAInstalled();
      addedEventListeners['appinstalled'](new Event('appinstalled'));

      expect(mockLogAnalyticsEvent).toHaveBeenCalled();
      const args = mockLogAnalyticsEvent.mock.calls[0];
      expect(args[0]).toBe('pwa.install.completed');
      expect(args[1].platform).toBe('android');
    });

    it('detects Desktop devices', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true
      });

      trackPWAInstalled();
      addedEventListeners['appinstalled'](new Event('appinstalled'));

      expect(mockLogAnalyticsEvent).toHaveBeenCalled();
      const args = mockLogAnalyticsEvent.mock.calls[0];
      expect(args[0]).toBe('pwa.install.completed');
      expect(args[1].platform).toBe('desktop');
    });

    it('defaults to unknown for other devices', () => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Some weird device',
        configurable: true
      });

      trackPWAInstalled();
      addedEventListeners['appinstalled'](new Event('appinstalled'));

      expect(mockLogAnalyticsEvent).toHaveBeenCalled();
      const args = mockLogAnalyticsEvent.mock.calls[0];
      expect(args[0]).toBe('pwa.install.completed');
      expect(args[1].platform).toBe('unknown');
    });
  });

  describe('getDisplayMode via trackPWAInstalled', () => {
    it('detects standalone mode', () => {
      globalThis.matchMedia = mock((query) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: mock(),
        removeListener: mock(),
        addEventListener: mock(),
        removeEventListener: mock(),
        dispatchEvent: mock(),
      }));

      trackPWAInstalled();
      addedEventListeners['appinstalled'](new Event('appinstalled'));

      expect(mockLogAnalyticsEvent).toHaveBeenCalled();
      const args = mockLogAnalyticsEvent.mock.calls[0];
      expect(args[1].displayMode).toBe('standalone');
      expect(args[1].standalone).toBe(true);
    });

    it('detects fullscreen mode', () => {
      globalThis.matchMedia = mock((query) => ({
        matches: query === '(display-mode: fullscreen)',
        media: query,
        onchange: null,
        addListener: mock(),
        removeListener: mock(),
        addEventListener: mock(),
        removeEventListener: mock(),
        dispatchEvent: mock(),
      }));

      trackPWAInstalled();
      addedEventListeners['appinstalled'](new Event('appinstalled'));

      expect(mockLogAnalyticsEvent).toHaveBeenCalled();
      const args = mockLogAnalyticsEvent.mock.calls[0];
      expect(args[1].displayMode).toBe('fullscreen');
      expect(args[1].standalone).toBe(false);
    });

    it('detects minimal-ui mode', () => {
      globalThis.matchMedia = mock((query) => ({
        matches: query === '(display-mode: minimal-ui)',
        media: query,
        onchange: null,
        addListener: mock(),
        removeListener: mock(),
        addEventListener: mock(),
        removeEventListener: mock(),
        dispatchEvent: mock(),
      }));

      trackPWAInstalled();
      addedEventListeners['appinstalled'](new Event('appinstalled'));

      expect(mockLogAnalyticsEvent).toHaveBeenCalled();
      const args = mockLogAnalyticsEvent.mock.calls[0];
      expect(args[1].displayMode).toBe('minimal-ui');
      expect(args[1].standalone).toBe(false);
    });

    it('defaults to browser mode', () => {
      globalThis.matchMedia = mock((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: mock(),
        removeListener: mock(),
        addEventListener: mock(),
        removeEventListener: mock(),
        dispatchEvent: mock(),
      }));

      trackPWAInstalled();
      addedEventListeners['appinstalled'](new Event('appinstalled'));

      expect(mockLogAnalyticsEvent).toHaveBeenCalled();
      const args = mockLogAnalyticsEvent.mock.calls[0];
      expect(args[1].displayMode).toBe('browser');
      expect(args[1].standalone).toBe(false);
    });
  });

  describe('Tracking Functions', () => {
    it('trackPWAInstallPrompt tracks prompt shown and outcome', async () => {
      trackPWAInstallPrompt();

      // Simulate 'beforeinstallprompt' event
      const mockUserChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
      const promptEvent = {
        platforms: ['web'],
        userChoice: mockUserChoice,
        prompt: mock(),
      };

      addedEventListeners['beforeinstallprompt'](promptEvent as unknown as Event);

      expect(mockLogAnalyticsEvent).toHaveBeenCalledTimes(1);
      expect(mockLogAnalyticsEvent.mock.calls[0][0]).toBe('pwa.install.prompt_shown');

      await mockUserChoice; // Wait for the promise inside the handler

      // Need a tick to let the `then` callback execute
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLogAnalyticsEvent).toHaveBeenCalledTimes(2);
      expect(mockLogAnalyticsEvent.mock.calls[1][0]).toBe('pwa.install.prompt_response');
      expect(mockLogAnalyticsEvent.mock.calls[1][1].outcome).toBe('accepted');
    });

    it('trackPWAInstalled stores install date in localStorage', () => {
      trackPWAInstalled();
      addedEventListeners['appinstalled'](new Event('appinstalled'));

      expect(mockLogAnalyticsEvent).toHaveBeenCalledTimes(1);
      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith(
        'omnilink_pwa_installed',
        expect.any(String)
      );
    });

    it('trackPWALaunch tracks when opened from home screen', () => {
      globalThis.matchMedia = mock((query) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: mock(),
        removeListener: mock(),
        addEventListener: mock(),
        removeEventListener: mock(),
        dispatchEvent: mock(),
      }));

      trackPWALaunch();

      expect(mockLogAnalyticsEvent).toHaveBeenCalledTimes(1);
      const args = mockLogAnalyticsEvent.mock.calls[0];
      expect(args[0]).toBe('pwa.launch');
      expect(args[1].standalone).toBe(true);
    });

    it('trackPWALaunch tracks when opened with pwa source param', () => {
      // Not standalone
      globalThis.matchMedia = mock((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: mock(),
        removeListener: mock(),
        addEventListener: mock(),
        removeEventListener: mock(),
        dispatchEvent: mock(),
      }));

      Object.defineProperty(globalThis, 'location', {
        value: { search: '?source=pwa' },
        configurable: true
      });

      trackPWALaunch();

      expect(mockLogAnalyticsEvent).toHaveBeenCalledTimes(1);
      const args = mockLogAnalyticsEvent.mock.calls[0];
      expect(args[0]).toBe('pwa.launch');
      expect(args[1].standalone).toBe(false); // But still tracked
    });

    it('trackPWALaunch does not track regular visits', () => {
      globalThis.matchMedia = mock((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: mock(),
        removeListener: mock(),
        addEventListener: mock(),
        removeEventListener: mock(),
        dispatchEvent: mock(),
      }));

      Object.defineProperty(globalThis, 'location', {
        value: { search: '' },
        configurable: true
      });

      trackPWALaunch();

      expect(mockLogAnalyticsEvent).not.toHaveBeenCalled();
    });

    it('trackServiceWorkerEvents tracks controllerchange', () => {
      const swEventListeners: Record<string, EventListener> = {};

      Object.defineProperty(globalThis.navigator, 'serviceWorker', {
        value: {
          addEventListener: mock((event: string, callback: EventListener) => {
            swEventListeners[event] = callback;
          }),
          ready: new Promise(() => {}) // Pending promise so it doesn't trigger ready part
        },
        configurable: true
      });

      trackServiceWorkerEvents();

      if (swEventListeners['controllerchange']) {
        swEventListeners['controllerchange'](new Event('controllerchange'));
        expect(mockLogAnalyticsEvent).toHaveBeenCalledTimes(1);
        expect(mockLogAnalyticsEvent.mock.calls[0][0]).toBe('pwa.sw.controller_changed');
      } else {
        expect(true).toBe(false); // Should have added listener
      }
    });

    it('trackNetworkStatus tracks offline/online transitions', () => {
      // Mock Date.now to control duration
      const originalDateNow = Date.now;
      let mockTime = 1000;
      globalThis.Date.now = () => mockTime;

      trackNetworkStatus();

      // Trigger offline
      mockTime = 2000;
      addedEventListeners['offline'](new Event('offline'));

      expect(mockLogAnalyticsEvent).toHaveBeenCalledTimes(1);
      expect(mockLogAnalyticsEvent.mock.calls[0][0]).toBe('pwa.network.offline');
      expect(mockLogAnalyticsEvent.mock.calls[0][1].onlineDuration).toBe(1000); // 2000 - 1000

      // Trigger online
      mockTime = 5000;
      addedEventListeners['online'](new Event('online'));

      expect(mockLogAnalyticsEvent).toHaveBeenCalledTimes(2);
      expect(mockLogAnalyticsEvent.mock.calls[1][0]).toBe('pwa.network.online');
      expect(mockLogAnalyticsEvent.mock.calls[1][1].offlineDuration).toBe(3000); // 5000 - 2000

      // Restore Date.now
      globalThis.Date.now = originalDateNow;
    });

    it('trackFeatureUsage tracks specific features', () => {
      trackFeatureUsage('dark_mode', { enabled: true });

      expect(mockLogAnalyticsEvent).toHaveBeenCalledTimes(1);
      const args = mockLogAnalyticsEvent.mock.calls[0];
      expect(args[0]).toBe('pwa.feature.dark_mode');
      expect(args[1].enabled).toBe(true);
    });

    it('trackPWAUninstall intercepts SW unregister', async () => {
      let unregisterCalled = false;
      const mockUnregister = mock(() => {
        unregisterCalled = true;
        return Promise.resolve(true);
      });

      const registrations = [{ unregister: mockUnregister }];

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'test',
          serviceWorker: {
            getRegistrations: mock(() => Promise.resolve(registrations))
          }
        },
        configurable: true
      });

      trackPWAUninstall();

      // Wait for registrations promise to resolve and interception to be set up
      await new Promise(resolve => setTimeout(resolve, 0));

      // Call the intercepted function
      await registrations[0].unregister();

      expect(unregisterCalled).toBe(true);
      expect(mockLogAnalyticsEvent).toHaveBeenCalledTimes(1);
      expect(mockLogAnalyticsEvent.mock.calls[0][0]).toBe('pwa.uninstall.sw_unregistered');
    });
  });

  describe('Initialization and Opt-out Flows', () => {
    it('optOutOfAnalytics sets localStorage flag', () => {
      optOutOfAnalytics();
      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('omnilink_analytics_optout', 'true');
    });

    it('optInToAnalytics removes localStorage flag', () => {
      optInToAnalytics();
      expect(globalThis.localStorage.removeItem).toHaveBeenCalledWith('omnilink_analytics_optout');
    });

    it('hasOptedOutOfAnalytics returns true when flag is set', () => {
      globalThis.localStorage.getItem = mock(() => 'true');
      expect(hasOptedOutOfAnalytics()).toBe(true);
    });

    it('hasOptedOutOfAnalytics returns false when flag is not set', () => {
      globalThis.localStorage.getItem = mock(() => null);
      expect(hasOptedOutOfAnalytics()).toBe(false);
    });

    it('initializePWAAnalytics skips initialization if opted out', () => {
      globalThis.localStorage.getItem = mock(() => 'true');

      const originalAddEventListener = globalThis.addEventListener;
      let listenersAdded = 0;
      globalThis.addEventListener = mock((event: string, callback: EventListener) => {
        listenersAdded++;
        originalAddEventListener(event, callback);
      });

      initializePWAAnalytics();

      expect(listenersAdded).toBe(0);
      globalThis.addEventListener = originalAddEventListener;
    });

    it('initializePWAAnalytics initializes all tracking if opted in', () => {
      globalThis.localStorage.getItem = mock(() => null);

      const listenerEvents: string[] = [];
      const originalAddEventListener = globalThis.addEventListener;
      globalThis.addEventListener = mock((event: string, callback: EventListener) => {
        listenerEvents.push(event);
        originalAddEventListener(event, callback);
      });

      Object.defineProperty(globalThis.navigator, 'serviceWorker', {
        value: {
          addEventListener: mock(),
          ready: new Promise(() => {}) // Pending promise so it doesn't trigger ready part
        },
        configurable: true
      });

      initializePWAAnalytics();

      // Check if the expected events were listened to
      expect(listenerEvents).toContain('beforeinstallprompt');
      expect(listenerEvents).toContain('appinstalled');
      expect(listenerEvents).toContain('offline');
      expect(listenerEvents).toContain('online');
      expect(listenerEvents).toContain('beforeunload');

      globalThis.addEventListener = originalAddEventListener;
    });

    it('session tracking works correctly', () => {
      globalThis.localStorage.getItem = mock(() => null);

      const originalDateNow = Date.now;
      let mockTime = 1000;
      globalThis.Date.now = () => mockTime;

      // Ensure we start with 1 page viewed
      const listenersEvents: Record<string, EventListener> = {};
      globalThis.addEventListener = mock((event: string, callback: EventListener) => {
        listenersEvents[event] = callback;
      });

      Object.defineProperty(globalThis.navigator, 'serviceWorker', {
        value: {
          addEventListener: mock(),
          ready: new Promise(() => {}) // Pending promise so it doesn't trigger ready part
        },
        configurable: true
      });

      // Need to mock history.pushState for the page view tracking
      const originalPushState = globalThis.history.pushState;
      globalThis.history.pushState = mock(originalPushState);

      initializePWAAnalytics();

      // Simulate a page view
      globalThis.history.pushState({}, '', '/new-page');

      // End session
      mockTime = 5000;
      listenersEvents['beforeunload'](new Event('beforeunload'));

      expect(mockLogAnalyticsEvent).toHaveBeenCalled();
      const sessionEndCall = mockLogAnalyticsEvent.mock.calls.find(call => call[0] === 'pwa.session.end');
      expect(sessionEndCall).toBeDefined();
      expect(sessionEndCall[1].duration).toBe(4000); // 5000 - 1000
      expect(sessionEndCall[1].pagesViewed).toBe(2); // 1 initial + 1 pushState

      globalThis.Date.now = originalDateNow;
      globalThis.history.pushState = originalPushState;
    });
  });
});
