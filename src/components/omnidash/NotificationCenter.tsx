/**
 * NotificationCenter - Persistent notification overlay for MAN Mode risk events
 *
 * Displays RED-lane blocked tasks requiring human approval/denial.
 * Uses existing ui/Dialog primitive. No new route created.
 *
 * @module components/omnidash/NotificationCenter
 */

import { useState, useCallback, useSyncExternalStore } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';

// ─── Notification Store (singleton, external) ────────────────────────────────

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

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const notifications = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    notifications,
    push: pushNotification,
    approve: approveTask,
    deny: denyTask,
  } as const;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NotificationCenter() {
  const { notifications, approve, deny } = useNotifications();
  const [open, setOpen] = useState(false);

  const pendingCount = notifications.filter((n) => n.status === 'pending').length;

  const handleApprove = useCallback(
    (taskId: string) => {
      approve(taskId);
    },
    [approve]
  );

  const handleDeny = useCallback(
    (taskId: string) => {
      deny(taskId);
    },
    [deny]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Open notification center"
          data-testid="notification-center-trigger"
        >
          <Bell className="h-5 w-5" />
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>MAN Mode Notifications</DialogTitle>
          <DialogDescription>
            Actions that require manual approval before proceeding.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4" data-testid="notification-list">
          {notifications.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pending notifications.
            </p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className="border rounded-lg p-3"
              data-testid={`notification-${n.id}`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm">{n.title}</p>
                <Badge
                  variant={
                    n.status === 'pending'
                      ? 'destructive'
                      : n.status === 'approved'
                        ? 'default'
                        : 'outline'
                  }
                >
                  {n.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{n.description}</p>
              {n.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(n.taskId)}
                    data-testid={`approve-${n.taskId}`}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeny(n.taskId)}
                    data-testid={`deny-${n.taskId}`}
                  >
                    Deny
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NotificationCenter;
