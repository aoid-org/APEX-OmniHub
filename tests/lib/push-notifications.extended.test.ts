import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logAnalyticsEventMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/lib/monitoring', () => ({
  logAnalyticsEvent: logAnalyticsEventMock,
}));

import {
  NOTIFICATION_TEMPLATES,
  enablePushNotifications,
  getPushSubscriptionStatus,
  initializePushNotifications,
  requestNotificationPermission,
  showLocalNotification,
  subscribeToPushNotifications,
  syncPushSubscriptionWithBackend,
  unsubscribeFromPushNotifications,
} from '@/lib/push-notifications';

type MutableGlobal = {
  Notification?: unknown;
  PushManager?: unknown;
};

describe('push-notifications extended', () => {
  const originalNavigator = globalThis.navigator;
  const originalNotification = (globalThis as unknown as MutableGlobal).Notification;
  const originalPushManager = (globalThis as unknown as MutableGlobal).PushManager;

  const setupPushEnvironment = (args?: {
    permission?: NotificationPermission;
    requestPermissionResult?: NotificationPermission;
    existingSubscription?: {
      endpoint: string;
      toJSON: () => PushSubscriptionJSON;
      unsubscribe: () => Promise<boolean>;
    } | null;
    createdSubscription?: {
      endpoint: string;
      toJSON: () => PushSubscriptionJSON;
      unsubscribe: () => Promise<boolean>;
    };
  }) => {
    const existingSubscription = args?.existingSubscription ?? null;
    const createdSubscription =
      args?.createdSubscription ??
      ({
        endpoint: 'https://push.example/new',
        toJSON: () =>
          ({
            endpoint: 'https://push.example/new',
            keys: { p256dh: 'p', auth: 'a' },
          }) as PushSubscriptionJSON,
        unsubscribe: async () => true,
      } as const);

    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(existingSubscription),
      subscribe: vi.fn().mockResolvedValue(createdSubscription),
    };

    const registration = {
      pushManager,
      showNotification: vi.fn().mockResolvedValue(undefined),
    };

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        ...originalNavigator,
        serviceWorker: {
          ready: Promise.resolve(registration),
          addEventListener: vi.fn(),
        },
      },
    });

    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: {
        permission: args?.permission ?? 'granted',
        requestPermission: vi
          .fn()
          .mockResolvedValue(args?.requestPermissionResult ?? 'granted'),
      },
    });

    Object.defineProperty(globalThis, 'PushManager', {
      configurable: true,
      value: function MockPushManager() {
        return undefined;
      },
    });

    return { registration, pushManager };
  };

  beforeEach(() => {
    logAnalyticsEventMock.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: originalNotification,
    });
    Object.defineProperty(globalThis, 'PushManager', {
      configurable: true,
      value: originalPushManager,
    });
    vi.restoreAllMocks();
  });

  it('requests notification permission and logs telemetry', async () => {
    setupPushEnvironment({ requestPermissionResult: 'granted' });
    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(logAnalyticsEventMock).toHaveBeenCalledWith(
      'push.permission.requested',
      expect.any(Object),
    );
  });

  it('subscribes with push manager and returns JSON payload', async () => {
    const { pushManager } = setupPushEnvironment({
      permission: 'default',
      requestPermissionResult: 'granted',
      existingSubscription: null,
    });

    const subscription = await subscribeToPushNotifications('AQID');
    expect(subscription?.endpoint).toBe('https://push.example/new');
    expect(pushManager.subscribe).toHaveBeenCalled();
    expect(logAnalyticsEventMock).toHaveBeenCalledWith(
      'push.subscribed',
      expect.any(Object),
    );
  });

  it('returns null when permission is denied during subscribe', async () => {
    setupPushEnvironment({
      permission: 'default',
      requestPermissionResult: 'denied',
    });

    await expect(
      subscribeToPushNotifications('AQID'),
    ).resolves.toBeNull();
  });

  it('unsubscribes and reports status', async () => {
    const existingSubscription = {
      endpoint: 'https://push.example/existing',
      toJSON: () =>
        ({
          endpoint: 'https://push.example/existing',
          keys: { p256dh: 'p', auth: 'a' },
        }) as PushSubscriptionJSON,
      unsubscribe: async () => true,
    };
    setupPushEnvironment({ existingSubscription });

    await expect(unsubscribeFromPushNotifications()).resolves.toBe(true);
    expect(logAnalyticsEventMock).toHaveBeenCalledWith(
      'push.unsubscribed',
      expect.objectContaining({ success: true }),
    );
  });

  it('shows local notification when permission is granted', async () => {
    const { registration } = setupPushEnvironment({ permission: 'granted' });

    await showLocalNotification({
      title: 'Alert',
      body: 'Body',
      data: { source: 'test' },
      tag: 'alert',
      requireInteraction: true,
      actions: [{ action: 'open-dash', title: 'Open' }],
    });

    expect(registration.showNotification).toHaveBeenCalledWith(
      'Alert',
      expect.objectContaining({
        body: 'Body',
        tag: 'alert',
        requireInteraction: true,
      }),
    );
    expect(logAnalyticsEventMock).toHaveBeenCalledWith(
      'push.notification.shown',
      expect.any(Object),
    );
  });

  it('returns current push subscription status', async () => {
    const existingSubscription = {
      endpoint: 'https://push.example/existing',
      toJSON: () =>
        ({
          endpoint: 'https://push.example/existing',
          keys: { p256dh: 'p', auth: 'a' },
        }) as PushSubscriptionJSON,
      unsubscribe: async () => true,
    };
    setupPushEnvironment({ permission: 'granted', existingSubscription });

    const status = await getPushSubscriptionStatus();
    expect(status.supported).toBe(true);
    expect(status.permission).toBe('granted');
    expect(status.subscribed).toBe(true);
    expect(status.subscription?.endpoint).toBe('https://push.example/existing');
  });

  it('syncs subscription with backend and handles backend errors', async () => {
    setupPushEnvironment();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        statusText: 'OK',
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response);

    await expect(
      syncPushSubscriptionWithBackend(
        {
          endpoint: 'https://push.example/new',
          keys: { p256dh: 'p', auth: 'a' },
        } as PushSubscriptionJSON,
        'user-1',
        'https://api.omnihub.local',
      ),
    ).resolves.toBeUndefined();

    await expect(
      syncPushSubscriptionWithBackend(
        {
          endpoint: 'https://push.example/new',
          keys: { p256dh: 'p', auth: 'a' },
        } as PushSubscriptionJSON,
        'user-1',
        'https://api.omnihub.local',
      ),
    ).rejects.toThrow(/failed to sync push subscription/i);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('initializes and enables push notifications safely', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await initializePushNotifications();
    expect(warnSpy).toHaveBeenCalledWith(
      '[Push] No VAPID key provided, skipping push initialization',
    );

    setupPushEnvironment({
      permission: 'granted',
      existingSubscription: {
        endpoint: 'https://push.example/existing',
        toJSON: () =>
          ({
            endpoint: 'https://push.example/existing',
            keys: { p256dh: 'p', auth: 'a' },
          }) as PushSubscriptionJSON,
        unsubscribe: async () => true,
      },
    });
    await initializePushNotifications('AQID');
    expect(warnSpy).toHaveBeenCalledWith(
      '[Push] Already subscribed to push notifications',
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        ...originalNavigator,
      },
    });
    await expect(enablePushNotifications('AQID')).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('builds expected notification templates', () => {
    const workflow = NOTIFICATION_TEMPLATES.workflowComplete('Ingestion');
    expect(workflow.title).toBe('Workflow Complete');
    expect(workflow.body).toContain('Ingestion');

    const integration = NOTIFICATION_TEMPLATES.integrationAlert(
      'GitHub',
      'Token expiring',
    );
    expect(integration.title).toContain('GitHub');
    expect(integration.requireInteraction).toBe(true);

    const policy = NOTIFICATION_TEMPLATES.policyViolation('MFA_REQUIRED');
    expect(policy.title).toContain('Policy Violation');
    expect(policy.body).toContain('MFA_REQUIRED');
  });
});
