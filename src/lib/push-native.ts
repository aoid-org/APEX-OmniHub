/**
 * Native Push Notifications - Capacitor Wrapper
 * Handles FCM (Android) and APNS (iOS) push notifications
 */

import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { logAnalyticsEvent } from './monitoring';
import { registerTokenWithBackend } from './push-native-backend';

export interface PushNotificationConfig {
    onTokenReceived?: (token: string) => Promise<void>;
    onNotificationReceived?: (notification: PushNotificationSchema) => void;
    onNotificationActionPerformed?: (action: ActionPerformed) => void;
}

/**
 * Check if running in native environment
 */
export function isNativeEnvironment(): boolean {
    return Capacitor.isNativePlatform();
}

/**
 * Initialize native push notifications
 */
export async function initializeNativePush(config: PushNotificationConfig): Promise<void> {
    if (!isNativeEnvironment()) {
        console.warn('[PushNative] Not running in native environment, skipping initialization');
        return;
    }

    try {
        // Request permission
        const permissionStatus = await PushNotifications.requestPermissions();

        if (permissionStatus.receive === 'granted') {
            // Register with OS
            await PushNotifications.register();

            void logAnalyticsEvent('push_native.initialized', {
                platform: Capacitor.getPlatform(),
                timestamp: new Date().toISOString(),
            });
        } else {
            console.warn('[PushNative] Push notification permission denied');
            void logAnalyticsEvent('push_native.permission_denied', {
                platform: Capacitor.getPlatform(),
                timestamp: new Date().toISOString(),
            });
        }

        // Set up listeners
        await PushNotifications.addListener('registration', async (token: Token) => {
            void logAnalyticsEvent('push_native.token_received', {
                platform: Capacitor.getPlatform(),
                timestamp: new Date().toISOString(),
            });

            // Register token with backend
            try {
                await registerTokenWithBackend(token.value, Capacitor.getPlatform());
            } catch (error) {
                console.error('[PushNative] Failed to register token with backend:', error);
            }

            if (config.onTokenReceived) {
                await config.onTokenReceived(token.value);
            }
        });

        await PushNotifications.addListener('registrationError', (error: unknown) => {
            console.error('[PushNative] Push registration error:', error);

            void logAnalyticsEvent('push_native.registration_error', {
                error: String(error),
                platform: Capacitor.getPlatform(),
                timestamp: new Date().toISOString(),
            });
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
            void logAnalyticsEvent('push_native.notification_received', {
                id: notification.id,
                title: notification.title,
                platform: Capacitor.getPlatform(),
                timestamp: new Date().toISOString(),
            });

            if (config.onNotificationReceived) {
                config.onNotificationReceived(notification);
            }
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
            void logAnalyticsEvent('push_native.action_performed', {
                actionId: action.actionId,
                notificationId: action.notification.id,
                platform: Capacitor.getPlatform(),
                timestamp: new Date().toISOString(),
            });

            if (config.onNotificationActionPerformed) {
                config.onNotificationActionPerformed(action);
            }
        });
    } catch (error) {
        console.error('[PushNative] Initialization failed:', error);
        throw error;
    }
}

/**
 * Get delivered notifications (iOS only)
 */
export async function getDeliveredNotifications(): Promise<PushNotificationSchema[]> {
    if (!isNativeEnvironment()) {
        return [];
    }

    try {
        const result = await PushNotifications.getDeliveredNotifications();
        return result.notifications;
    } catch (error) {
        console.error('[PushNative] Failed to get delivered notifications:', error);
        return [];
    }
}

/**
 * Remove delivered notifications
 */
export async function removeDeliveredNotifications(notifications: PushNotificationSchema[]): Promise<void> {
    if (!isNativeEnvironment()) {
        return;
    }

    try {
        await PushNotifications.removeDeliveredNotifications({
            notifications: notifications.map(n => ({ id: n.id })),
        });
    } catch (error) {
        console.error('[PushNative] Failed to remove delivered notifications:', error);
    }
}

/**
 * Remove all delivered notifications
 */
export async function removeAllDeliveredNotifications(): Promise<void> {
    if (!isNativeEnvironment()) {
        return;
    }

    try {
        await PushNotifications.removeAllDeliveredNotifications();
    } catch (error) {
        console.error('[PushNative] Failed to remove all delivered notifications:', error);
    }
}
