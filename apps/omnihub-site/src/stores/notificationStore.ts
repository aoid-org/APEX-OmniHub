/**
 * Notification Store — MAN Mode and Universal Alerts
 * @version 1.0.0
 * @module apps/omnihub-site/src/stores/notificationStore
 *
 * Global Zustand store for notifications.
 * Removes fake hardcoded data in favor of an honest empty state,
 * or real MAN Mode approvals.
 *
 * APEX STANDARDS ENFORCED:
 * - Production Truthfulness: No fake data.
 */

import { create } from 'zustand';

export type NotificationBadge = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'NEW' | 'MAN_MODE';

export interface AppNotification {
  id: string;
  label: string;
  description?: string;
  badge: NotificationBadge;
  createdAt: number;
  read: boolean;
  actionable?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Honest Empty State: Start with zero notifications unless hydrated from real API
  notifications: [],

  addNotification: (n) => set((state) => ({
    notifications: [
      {
        ...n,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        read: false,
      },
      ...state.notifications
    ]
  })),

  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) => 
      n.id === id ? { ...n, read: true } : n
    )
  })),

  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),

  clearAll: () => set({ notifications: [] }),

  getUnreadCount: () => get().notifications.filter(n => !n.read).length
}));
