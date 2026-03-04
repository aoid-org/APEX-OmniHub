/**
 * Notification Store - Global state for MAN Mode risk events
 *
 * @module stores/notificationStore
 */

import { useSyncExternalStore } from 'react';

export interface ManModeNotification {
  readonly id: string;
  readonly taskId: string;
  readonly title: string;
  readonly description: string;
  readonly lane: 'RED';
  readonly timestamp: number;
  readonly status: 'pending' | 'approved' | 'denied';
}

type Listener = () => void;

let _notifications: readonly ManModeNotification[] = [];
const _listeners = new Set<Listener>();

function emitChange(): void {
  for (const listener of _listeners) {
    listener();
  }
}

function subscribe(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function getSnapshot(): readonly ManModeNotification[] {
  return _notifications;
}

export function pushNotification(
  notification: Omit<ManModeNotification, 'timestamp' | 'status'>
): void {
  _notifications = [
    ...getSnapshot(),
    { ...notification, timestamp: Date.now(), status: 'pending' },
  ];
  emitChange();
}

export function approveTask(taskId: string): void {
  _notifications = getSnapshot().map((n) =>
    n.taskId === taskId ? { ...n, status: 'approved' as const } : n
  );
  emitChange();
}

export function denyTask(taskId: string): void {
  _notifications = getSnapshot().map((n) =>
    n.taskId === taskId ? { ...n, status: 'denied' as const } : n
  );
  emitChange();
}

export function useNotifications() {
  const notifications = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    notifications,
    push: pushNotification,
    approve: approveTask,
    deny: denyTask,
  } as const;
}
