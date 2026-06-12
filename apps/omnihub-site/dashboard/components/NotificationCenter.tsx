/**
 * NotificationCenter - Persistent notification overlay for MAN Mode risk events
 *
 * Displays RED-lane blocked tasks requiring Manual Approval Node decision handling.
 * Uses existing ui/Dialog primitive. No new route created.
 *
 * @module components/omnidash/NotificationCenter
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
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

import { useNotificationStore, type AppNotification } from '../../src/stores/notificationStore';
import { supabase } from '../../src/lib/supabase';

// ─── Component ───────────────────────────────────────────────────────────────

function getBadgeVariant(status: string) {
  if (status === 'pending') return 'destructive' as const;
  if (status === 'approved') return 'default' as const;
  return 'outline' as const;
}

// --- Helper Components ---------------------------------------------------------

function NotificationItem({ n, handleApprove, handleDeny }: Readonly<{ n: AppNotification, handleApprove: (id: string) => void, handleDeny: (id: string) => void }>) {
  const isPending = n.badge === 'MAN_MODE' && !n.read;
  const badgeVariant = getBadgeVariant(isPending ? 'pending' : n.badge.toLowerCase());
  
  return (
    <div
      className={`relative group overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-md ${
        isPending
          ? 'bg-white dark:bg-neutral-900 border-red-200 dark:border-red-900/50 shadow-sm'
          : 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 opacity-75 grayscale-[0.5]'
      }`}
      data-testid={`notification-${n.id}`}
    >
      {isPending && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500 dark:bg-red-600 rounded-l-xl" />
      )}
      
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between mb-2">
          <p className="font-semibold text-sm leading-tight text-neutral-900 dark:text-neutral-100 tracking-tight pr-4">
            {n.label}
          </p>
          <Badge
            variant={badgeVariant}
            className="shrink-0 uppercase tracking-wider text-[10px] font-bold"
          >
            {n.badge}
          </Badge>
        </div>
        <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 line-clamp-2">
          {n.description}
        </p>
        
        {isPending && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              size="sm"
              className="w-full font-medium shadow-sm transition-transform active:scale-[0.98] bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900"
              onClick={() => {
                if (n.onApprove) n.onApprove();
                handleApprove(n.id);
              }}
              data-testid={`approve-${n.id}`}
            >
              Authorize
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full font-medium transition-transform active:scale-[0.98] hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-900"
              onClick={() => {
                if (n.onReject) n.onReject();
                handleDeny(n.id);
              }}
              data-testid={`deny-${n.id}`}
            >
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const notifications = useNotificationStore(s => s.notifications);
  const addNotification = useNotificationStore(s => s.addNotification);
  const markAsRead = useNotificationStore(s => s.markAsRead);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('notification-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'omnilink_orchestration_requests' },
        (payload) => {
          const req = payload.new;
          addNotification({
            label: `New Orchestration Request: ${req.id.slice(0, 8)}`,
            description: `Status: ${req.status || 'pending'}`,
            badge: req.status === 'pending_approval' ? 'MAN_MODE' : 'INFO',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNotification]);

  // ⚡ Bolt: Memoized pending notifications count to avoid recalculating on every re-render
  const pendingCount = useMemo(
    () => notifications.filter((n: AppNotification) => !n.read).length,
    [notifications]
  );

  const handleApprove = useCallback((id: string) => markAsRead(id), [markAsRead]);
  const handleDeny = useCallback((id: string) => markAsRead(id), [markAsRead]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full group"
          aria-label="Open notification center"
          data-testid="notification-center-trigger"
        >
          <Bell className="h-5 w-5 text-neutral-600 dark:text-neutral-300 drop-shadow-sm group-hover:scale-105 transition-transform" />
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold shadow-sm animate-in zoom-in-50"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0 border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl rounded-2xl bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl">
        <DialogHeader className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800/50">
          <DialogTitle className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
            MAN Mode Notifications
            {pendingCount > 0 && (
              <span className="text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                {pendingCount} Pending
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-500 dark:text-neutral-400">
            Actions requiring explicit human authorization before system execution.
          </DialogDescription>
        </DialogHeader>
        
        <div 
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-neutral-50/50 dark:bg-neutral-900/20" 
          data-testid="notification-list"
        >
          {notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
              </div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-200">All clear</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">No pending notifications require your attention.</p>
            </div>
          )}
          
          {notifications.map((n: AppNotification) => (
            <NotificationItem 
              key={n.id} 
              n={n} 
              handleApprove={handleApprove} 
              handleDeny={handleDeny} 
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NotificationCenter;
