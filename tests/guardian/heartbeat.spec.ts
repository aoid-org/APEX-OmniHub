import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { getLoopStatuses, recordLoopHeartbeat, resetHeartbeats } from '../../src/guardian/heartbeat';

describe('guardian heartbeat', () => {
  beforeEach(() => {
    resetHeartbeats();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records and reports healthy heartbeat', () => {
    recordLoopHeartbeat('test-loop', Date.now());
    const [status] = getLoopStatuses();
    expect(status.loopName).toBe('test-loop');
    expect(status.status).toBe('healthy');
  });

  it('marks loop stale when lastSeen is old', () => {
    recordLoopHeartbeat('old-loop', Date.now() - 200000);
    const [status] = getLoopStatuses(100000);
    expect(status.status).toBe('stale');
  });

  describe('getLoopStatuses staleness calculation', () => {
    it('uses the default staleAfterMs of 120000', () => {
      const now = 1000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // 119999ms ago (just under 120000) -> healthy
      recordLoopHeartbeat('almost-stale', now - 119999);
      // 120001ms ago (just over 120000) -> stale
      recordLoopHeartbeat('just-stale', now - 120001);

      const statuses = getLoopStatuses();

      const almostStale = statuses.find(s => s.loopName === 'almost-stale')!;
      expect(almostStale.status).toBe('healthy');
      expect(almostStale.ageMs).toBe(119999);

      const justStale = statuses.find(s => s.loopName === 'just-stale')!;
      expect(justStale.status).toBe('stale');
      expect(justStale.ageMs).toBe(120001);
    });

    it('correctly calculates ageMs and status based on a custom staleAfterMs', () => {
      const now = 500000;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // lastSeen = 490000, ageMs = 10000
      recordLoopHeartbeat('loop1', 490000);

      const statusesHealthy = getLoopStatuses(10000);
      expect(statusesHealthy[0].loopName).toBe('loop1');
      expect(statusesHealthy[0].ageMs).toBe(10000);
      // exact match should be healthy because ageMs > staleAfterMs is false
      expect(statusesHealthy[0].status).toBe('healthy');

      const statusesStale = getLoopStatuses(9999);
      expect(statusesStale[0].status).toBe('stale');
    });

    it('returns an empty array if there are no heartbeats', () => {
      const statuses = getLoopStatuses();
      expect(statuses).toEqual([]);
    });
  });
});
