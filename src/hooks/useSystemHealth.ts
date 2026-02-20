/**
 * useSystemHealth — Singleton health poller with exponential backoff.
 *
 * CRITICAL: Uses module-scope singleton so multiple consumers
 * (Header, Sidebar, etc.) share ONE polling loop. No duplicate intervals.
 *
 * Backoff: BASE_INTERVAL * 2^failCount, capped at MAX_INTERVAL.
 * In-flight guard: prevents overlapping heartbeat checks.
 */

import { useSyncExternalStore, useCallback } from 'react';
import { getLoopStatuses, type GuardianLoopStatus } from '@/guardian/heartbeat';

export type HealthStatus = 'healthy' | 'degraded' | 'critical';

interface HealthState {
  status: HealthStatus;
  lastChecked: Date;
  loopStatuses: GuardianLoopStatus[];
}

const BASE_INTERVAL_MS = 30_000;
const MAX_INTERVAL_MS = 300_000;

// ---------------------------------------------------------------------------
// Module-scope singleton store
// ---------------------------------------------------------------------------

let currentState: HealthState = {
  status: 'healthy',
  lastChecked: new Date(),
  loopStatuses: [],
};

const listeners = new Set<() => void>();
let failCount = 0;
let inFlight = false;
let timeoutId: ReturnType<typeof setTimeout> | null = null;
let started = false;

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(next: HealthState) {
  currentState = next;
  emitChange();
}

function deriveStatus(statuses: GuardianLoopStatus[]): HealthStatus {
  if (statuses.length === 0) return 'healthy';
  const staleCount = statuses.filter((s) => s.status === 'stale').length;
  if (staleCount === 0) return 'healthy';
  if (staleCount < statuses.length) return 'degraded';
  return 'critical';
}

async function ping() {
  if (inFlight) return;
  inFlight = true;

  try {
    const statuses = getLoopStatuses();
    const status = deriveStatus(statuses);
    failCount = 0;
    setState({ status, lastChecked: new Date(), loopStatuses: statuses });
  } catch {
    failCount += 1;
    setState({ ...currentState, status: 'critical', lastChecked: new Date() });
  } finally {
    inFlight = false;
  }
}

function clearTimer() {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}

function scheduleNext() {
  clearTimer();
  const delay = Math.min(BASE_INTERVAL_MS * 2 ** failCount, MAX_INTERVAL_MS);
  timeoutId = setTimeout(() => {
    void loop();
  }, delay);
}

async function loop() {
  await ping();
  scheduleNext();
}

function startPolling() {
  if (started) return;
  started = true;
  void loop();
}

function stopPolling() {
  started = false;
  clearTimer();
}

// ---------------------------------------------------------------------------
// useSyncExternalStore API
// ---------------------------------------------------------------------------

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  // Start polling on first subscriber
  if (listeners.size === 1) {
    startPolling();
  }

  return () => {
    listeners.delete(onStoreChange);
    // Stop polling when last subscriber unsubscribes
    if (listeners.size === 0) {
      stopPolling();
    }
  };
}

function getSnapshot(): HealthState {
  return currentState;
}

function getServerSnapshot(): HealthState {
  return currentState;
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

export function useSystemHealth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const pingSystem = useCallback(async () => {
    await ping();
  }, []);

  return {
    status: state.status,
    lastChecked: state.lastChecked,
    loopStatuses: state.loopStatuses,
    pingSystem,
  };
}
