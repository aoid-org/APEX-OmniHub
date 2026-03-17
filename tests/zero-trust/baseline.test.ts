import { describe, it, expect } from 'vitest';
import { computeBaseline, formatBaseline, verifyDeviceIntegrity } from '../../src/zero-trust/baseline';
import type { ActivityLog } from '../../src/zero-trust/baseline';

// ============================================================================
// computeBaseline
// ============================================================================
describe('computeBaseline', () => {
  it('returns empty array for empty input', () => {
    expect(computeBaseline([])).toEqual([]);
  });

  it('returns a single metric for one user/device pair', () => {
    const logs: ActivityLog[] = [
      { userId: 'u1', deviceId: 'd1', timestamp: 1000, action: 'login', durationMs: 5000 },
    ];
    const metrics = computeBaseline(logs);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].userId).toBe('u1');
    expect(metrics[0].deviceId).toBe('d1');
    expect(metrics[0].totalSessions).toBe(1);
    expect(metrics[0].avgSessionDuration).toBe(5000);
    expect(metrics[0].uniqueActions).toBe(1);
    expect(metrics[0].risk).toBe('normal');
  });

  it('computes risk=elevated when avgSessionDuration < 1000', () => {
    const logs: ActivityLog[] = [
      { userId: 'u1', deviceId: 'd1', timestamp: 1000, action: 'login', durationMs: 500 },
      { userId: 'u1', deviceId: 'd1', timestamp: 2000, action: 'click', durationMs: 200 },
    ];
    const metrics = computeBaseline(logs);
    expect(metrics[0].avgSessionDuration).toBeLessThan(1000);
    expect(metrics[0].risk).toBe('elevated');
  });

  it('computes risk=elevated when uniqueActions > 10', () => {
    const actions = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
    const logs: ActivityLog[] = actions.map((action, i) => ({
      userId: 'u1',
      deviceId: 'd1',
      timestamp: i * 1000,
      action,
      durationMs: 2000,
    }));
    const metrics = computeBaseline(logs);
    expect(metrics[0].uniqueActions).toBe(11);
    expect(metrics[0].risk).toBe('elevated');
  });

  it('computes risk=normal when avgSessionDuration >= 1000 and uniqueActions <= 10', () => {
    const logs: ActivityLog[] = [
      { userId: 'u1', deviceId: 'd1', timestamp: 1000, action: 'login', durationMs: 2000 },
      { userId: 'u1', deviceId: 'd1', timestamp: 2000, action: 'click', durationMs: 3000 },
    ];
    const metrics = computeBaseline(logs);
    expect(metrics[0].risk).toBe('normal');
  });

  it('groups by userId:deviceId', () => {
    const logs: ActivityLog[] = [
      { userId: 'u1', deviceId: 'd1', timestamp: 1000, action: 'login', durationMs: 2000 },
      { userId: 'u2', deviceId: 'd2', timestamp: 2000, action: 'login', durationMs: 3000 },
      { userId: 'u1', deviceId: 'd1', timestamp: 3000, action: 'logout', durationMs: 1500 },
    ];
    const metrics = computeBaseline(logs);
    expect(metrics).toHaveLength(2);
    const u1 = metrics.find((m) => m.userId === 'u1' && m.deviceId === 'd1')!;
    expect(u1.totalSessions).toBe(2);
    expect(u1.uniqueActions).toBe(2);
  });

  it('computes lastSeen as max timestamp', () => {
    const logs: ActivityLog[] = [
      { userId: 'u1', deviceId: 'd1', timestamp: 1000, action: 'login' },
      { userId: 'u1', deviceId: 'd1', timestamp: 9000, action: 'logout' },
      { userId: 'u1', deviceId: 'd1', timestamp: 5000, action: 'click' },
    ];
    const metrics = computeBaseline(logs);
    expect(metrics[0].lastSeen).toBe(9000);
  });

  it('handles missing durationMs (treats as 0)', () => {
    const logs: ActivityLog[] = [
      { userId: 'u1', deviceId: 'd1', timestamp: 1000, action: 'login' },
    ];
    const metrics = computeBaseline(logs);
    expect(metrics[0].avgSessionDuration).toBe(0);
    expect(metrics[0].risk).toBe('elevated'); // 0 < 1000
  });
});

// ============================================================================
// formatBaseline
// ============================================================================
describe('formatBaseline', () => {
  it('returns empty string for empty input', () => {
    expect(formatBaseline([])).toBe('');
  });

  it('formats a single metric', () => {
    const metrics = computeBaseline([
      { userId: 'u1', deviceId: 'd1', timestamp: 1000, action: 'login', durationMs: 2500 },
    ]);
    const result = formatBaseline(metrics);
    expect(result).toContain('u1/d1');
    expect(result).toContain('sessions=1');
    expect(result).toContain('avgMs=2500');
    expect(result).toContain('actions=1');
    expect(result).toContain('risk=normal');
  });

  it('separates multiple metrics with newlines', () => {
    const logs: ActivityLog[] = [
      { userId: 'u1', deviceId: 'd1', timestamp: 1000, action: 'login', durationMs: 2000 },
      { userId: 'u2', deviceId: 'd2', timestamp: 2000, action: 'login', durationMs: 3000 },
    ];
    const metrics = computeBaseline(logs);
    const result = formatBaseline(metrics);
    expect(result.split('\n')).toHaveLength(2);
  });

  it('rounds avgMs in output', () => {
    const logs: ActivityLog[] = [
      { userId: 'u1', deviceId: 'd1', timestamp: 1000, action: 'a', durationMs: 1000 },
      { userId: 'u1', deviceId: 'd1', timestamp: 2000, action: 'b', durationMs: 2000 },
    ];
    const metrics = computeBaseline(logs);
    // avg = 1500 → Math.round(1500) = 1500
    const result = formatBaseline(metrics);
    expect(result).toContain('avgMs=1500');
  });
});

// ============================================================================
// verifyDeviceIntegrity
// ============================================================================
describe('verifyDeviceIntegrity', () => {
  it('returns false for a known compromised device (dev-000)', () => {
    expect(verifyDeviceIntegrity('dev-000')).toBe(false);
  });

  it('returns false for a known compromised device (emulator-x86)', () => {
    expect(verifyDeviceIntegrity('emulator-x86')).toBe(false);
  });

  it('returns false for a known compromised device (root-bypass-tool)', () => {
    expect(verifyDeviceIntegrity('root-bypass-tool')).toBe(false);
  });

  it('returns false for a device ID that is too short (< 8 chars)', () => {
    expect(verifyDeviceIntegrity('abc')).toBe(false);
  });

  it('returns false for a device ID with invalid characters', () => {
    expect(verifyDeviceIntegrity('device@#$%')).toBe(false);
  });

  it('returns false for an empty device ID', () => {
    expect(verifyDeviceIntegrity('')).toBe(false);
  });

  it('returns true for a valid device ID (exactly 8 chars, alphanumeric)', () => {
    expect(verifyDeviceIntegrity('device01')).toBe(true);
  });

  it('returns true for a valid UUID-style device ID', () => {
    expect(verifyDeviceIntegrity('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('returns true for a valid device ID with underscores', () => {
    expect(verifyDeviceIntegrity('device_id_123')).toBe(true);
  });

  it('returns true for a valid device ID at max length (64 chars)', () => {
    const id = 'a'.repeat(64);
    expect(verifyDeviceIntegrity(id)).toBe(true);
  });

  it('returns false for a device ID that is too long (> 64 chars)', () => {
    const id = 'a'.repeat(65);
    expect(verifyDeviceIntegrity(id)).toBe(false);
  });
});
