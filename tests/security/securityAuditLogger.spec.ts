import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SecurityEventType,
  securityAuditLogger,
} from '@/security/securityAuditLogger';

describe('SecurityAuditLogger', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be a singleton', async () => {
    const mod = await import('@/security/securityAuditLogger');
    expect(mod.securityAuditLogger).toBe(securityAuditLogger);
  });

  it('should log an event without throwing', () => {
    expect(() =>
      securityAuditLogger.log({
        eventType: SecurityEventType.AUTH_LOGIN_SUCCESS,
        userId: 'user-1',
        result: 'success',
      })
    ).not.toThrow();
  });

  it('should log auth success', () => {
    expect(() =>
      securityAuditLogger.logAuthSuccess('user-1', '127.0.0.1')
    ).not.toThrow();
  });

  it('should log auth failure', () => {
    expect(() =>
      securityAuditLogger.logAuthFailure('user-1', '127.0.0.1', 'bad password')
    ).not.toThrow();
  });

  it('should log auth failure with undefined userId', () => {
    expect(() =>
      securityAuditLogger.logAuthFailure(undefined, '10.0.0.1', 'unknown user')
    ).not.toThrow();
  });

  it('should log access denied', () => {
    expect(() =>
      securityAuditLogger.logAccessDenied('user-1', '/admin', 'read')
    ).not.toThrow();
  });

  it('should log data access', () => {
    expect(() =>
      securityAuditLogger.logDataAccess('user-1', 'users_table', 42)
    ).not.toThrow();
  });

  it('should log security anomaly', () => {
    expect(() =>
      securityAuditLogger.logSecurityAnomaly('user-1', 'brute-force', 'high')
    ).not.toThrow();
  });

  it('should log security anomaly with undefined userId', () => {
    expect(() =>
      securityAuditLogger.logSecurityAnomaly(undefined, 'geo-anomaly', 'medium')
    ).not.toThrow();
  });

  it('should flush events to API endpoint', async () => {
    // Fill buffer to trigger auto-flush (bufferSize = 100)
    for (let i = 0; i < 100; i++) {
      securityAuditLogger.log({
        eventType: SecurityEventType.DATA_ACCESS,
        result: 'success',
      });
    }
    // flush should have been called
    expect(fetch).toHaveBeenCalled();
  });

  it('should handle flush errors gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));
    // Trigger flush directly
    await expect(securityAuditLogger.flush()).resolves.not.toThrow();
  });

  it('should include all event types in SecurityEventType enum', () => {
    expect(SecurityEventType.AUTH_LOGIN_SUCCESS).toBe('auth.login.success');
    expect(SecurityEventType.AUTH_LOGIN_FAILURE).toBe('auth.login.failure');
    expect(SecurityEventType.AUTH_LOGOUT).toBe('auth.logout');
    expect(SecurityEventType.ACCESS_DENIED).toBe('access.denied');
    expect(SecurityEventType.DATA_ACCESS).toBe('data.access');
    expect(SecurityEventType.DATA_MODIFICATION).toBe('data.modification');
    expect(SecurityEventType.DATA_DELETION).toBe('data.deletion');
    expect(SecurityEventType.ADMIN_ACTION).toBe('admin.action');
    expect(SecurityEventType.SECURITY_ANOMALY).toBe('security.anomaly');
    expect(SecurityEventType.RATE_LIMIT_EXCEEDED).toBe('security.rate_limit');
    expect(SecurityEventType.AUTH_MFA_ENABLED).toBe('auth.mfa.enabled');
    expect(SecurityEventType.AUTH_PASSWORD_CHANGE).toBe('auth.password.change');
  });
});
