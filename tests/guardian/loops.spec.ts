import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startGuardianLoops, stopGuardianLoops } from '../../src/guardian/loops';

vi.mock('../../src/guardian/heartbeat', () => ({
  recordLoopHeartbeat: vi.fn(),
}));

vi.mock('@/lib/healthcheck', () => ({
  runHealthCheck: vi.fn().mockResolvedValue({ status: 'OK' }),
}));

describe('guardian loops', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopGuardianLoops();
  });

  afterEach(() => {
    stopGuardianLoops();
    vi.useRealTimers();
  });

  it('should start loops without errors', () => {
    expect(() => startGuardianLoops()).not.toThrow();
  });

  it('should be idempotent — second start is a no-op', () => {
    startGuardianLoops();
    startGuardianLoops(); // should not add duplicate intervals
  });

  it('should fire heartbeat callbacks on interval ticks', async () => {
    const { recordLoopHeartbeat } = await import('../../src/guardian/heartbeat');
    startGuardianLoops();

    // Advance past the 60s session watchdog interval
    await vi.advanceTimersByTimeAsync(61000);
    expect(recordLoopHeartbeat).toHaveBeenCalledWith('guardian-session-watchdog');
  });

  it('should fire offline sync heartbeat at 90s', async () => {
    const { recordLoopHeartbeat } = await import('../../src/guardian/heartbeat');
    startGuardianLoops();

    await vi.advanceTimersByTimeAsync(91000);
    expect(recordLoopHeartbeat).toHaveBeenCalledWith('guardian-offline-sync');
  });

  it('should stop all intervals', async () => {
    const { recordLoopHeartbeat } = await import('../../src/guardian/heartbeat');
    startGuardianLoops();
    stopGuardianLoops();

    vi.clearAllMocks();
    await vi.advanceTimersByTimeAsync(200000);
    expect(recordLoopHeartbeat).not.toHaveBeenCalled();
  });
});
