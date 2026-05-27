/**
 * Real-Time Subscription Bindings — OmniDash
 *
 * Subscribes to Supabase Realtime channels for all OmniDash tables and
 * invalidates the corresponding TanStack Query cache keys on database
 * changes. This keeps the UI synchronized without polling.
 *
 * Uses supabase.channel() directly for simplicity (no IRealtime abstraction).
 *
 * APEX STANDARDS:
 * - Uses Supabase Realtime channels (not polling)
 * - Invalidates specific query keys (not full cache flush)
 * - Cleans up subscriptions on unmount
 * - Scoped to user_id for RLS alignment
 *
 * @module omnidash/realtime
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * OmniDash tables that we subscribe to for real-time Postgres changes.
 * Each table maps to its corresponding TanStack Query cache key.
 */
const REALTIME_TABLE_QUERY_MAP = {
  omnidash_settings:       'omnidash-settings',
  omnidash_today_items:    'omnidash-today',
  omnidash_pipeline_items: 'omnidash-pipeline',
  omnidash_kpi_daily:      'omnidash-kpi',
  omnidash_incidents:      'omnidash-incidents',
} as const;

type RealtimeTable = keyof typeof REALTIME_TABLE_QUERY_MAP;

const REALTIME_TABLES = Object.keys(REALTIME_TABLE_QUERY_MAP) as RealtimeTable[];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useRealtimeOmniDash — Binds OmniDash UI to Supabase Realtime channels.
 *
 * On INSERT, UPDATE, or DELETE events for any OmniDash table, the
 * corresponding TanStack Query cache is invalidated so the UI re-fetches
 * fresh data automatically.
 *
 * Subscriptions are scoped to the current user's ID (matching RLS filters)
 * and are cleaned up when the component unmounts or the user changes.
 *
 * Usage:
 * ```tsx
 * function OmniDashShell() {
 *   useRealtimeOmniDash();
 *   // ... rest of OmniDash UI
 * }
 * ```
 */
export function useRealtimeOmniDash(): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;
    const channelName = `omnidash-realtime-${userId}`;
    let channel = supabase.channel(channelName);

    // Subscribe to all OmniDash tables for INSERT/UPDATE/DELETE events
    for (const table of REALTIME_TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel = (channel as any).on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Build the query key for this table
          // omnidash_settings uses ['omnidash-settings', user.id]
          // All others use the base key only (no user.id suffix)
          const baseKey = REALTIME_TABLE_QUERY_MAP[table];

          if (table === 'omnidash_settings') {
            queryClient.invalidateQueries({
              queryKey: [baseKey, userId],
            });
          } else {
            queryClient.invalidateQueries({
              queryKey: [baseKey],
            });
          }
        },
      );
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Channel is active — OmniDash is now receiving real-time updates
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[OmniDash Realtime] Channel error for ${channelName}`);
      }
    });

    // Cleanup: remove the channel on unmount or user change
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
