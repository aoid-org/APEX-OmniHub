import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runHealthCheckMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ status: 'OK' }),
);

vi.mock('@/lib/healthcheck', () => ({
  runHealthCheck: runHealthCheckMock,
}));

import { getLoopStatuses, resetHeartbeats } from '@/guardian/heartbeat';
import { startGuardianLoops, stopGuardianLoops } from '@/guardian/loops';

describe('guardian loops', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.useFakeTimers();
    runHealthCheckMock.mockReset();
    runHealthCheckMock.mockResolvedValue({ status: 'OK' });
    resetHeartbeats();
  });

  afterEach(() => {
    stopGuardianLoops();
    resetHeartbeats();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts watchdog loops and records heartbeats', async () => {
    startGuardianLoops();

    vi.advanceTimersByTime(120_000);
    await Promise.resolve();

    const names = getLoopStatuses().map((status) => status.loopName);
    expect(names).toContain('guardian-session-watchdog');
    expect(names).toContain('guardian-offline-sync');
  });

  it('records health ping in SSR mode without invoking runHealthCheck', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: undefined,
    });

    startGuardianLoops();
    vi.advanceTimersByTime(120_000);
    await Promise.resolve();

    const names = getLoopStatuses().map((status) => status.loopName);
    expect(names).toContain('guardian-health-ping');
    expect(runHealthCheckMock).not.toHaveBeenCalled();
  });

  it('does not duplicate intervals when started multiple times', async () => {
    startGuardianLoops();
    startGuardianLoops();

    vi.advanceTimersByTime(60_000);
    await Promise.resolve();

    const names = getLoopStatuses().map((status) => status.loopName);
    const unique = new Set(names);
    expect(names).toHaveLength(unique.size);
    expect(names).toContain('guardian-session-watchdog');
  });

  it('does not record health heartbeat when backend returns non-OK status', async () => {
    runHealthCheckMock.mockResolvedValue({ status: 'ERROR' });

    startGuardianLoops();
    vi.advanceTimersByTime(120_000);
    await Promise.resolve();

    const names = getLoopStatuses().map((status) => status.loopName);
    expect(names).toContain('guardian-session-watchdog');
    expect(names).toContain('guardian-offline-sync');
    expect(names).not.toContain('guardian-health-ping');
  });
});
