import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logSecurityEvent, startGuardianLoops, debugLogger } = vi.hoisted(() => ({
  logSecurityEvent: vi.fn(),
  startGuardianLoops: vi.fn(),
  debugLogger: vi.fn(),
}));

vi.mock('@/lib/monitoring', () => ({
  logSecurityEvent,
}));

vi.mock('@/guardian/loops', () => ({
  startGuardianLoops,
}));

vi.mock('@/lib/debug-logger', () => ({
  createDebugLogger: () => debugLogger,
}));

import {
  checkAccountLockout,
  clearFailedAuthAttempts,
  detectSuspiciousActivity,
  generateCsrfToken,
  generateRequestSignature,
  getCsrfToken,
  initializeCsrfProtection,
  initializeSecurity,
  isValidRedirectUrl,
  recordFailedAuthAttempt,
  recordLoginAttempt,
  sanitizeInput,
  storeCsrfToken,
  validateCsrfToken,
  verifyRequestSignature,
} from '@/lib/security';

describe('security utilities', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('manages CSRF tokens across generation, storage, validation, and initialization', () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    storeCsrfToken(token);
    expect(getCsrfToken()).toBe(token);
    expect(validateCsrfToken(token)).toBe(true);

    expect(validateCsrfToken('bad-token')).toBe(false);
    expect(logSecurityEvent).toHaveBeenCalledWith('csrf_attempt', { providedToken: 'present' });

    sessionStorage.clear();
    initializeCsrfProtection();
    const initialized = getCsrfToken();
    expect(initialized).toMatch(/^[0-9a-f]{64}$/);

    initializeCsrfProtection();
    expect(getCsrfToken()).toBe(initialized);
  });

  it('sanitizes markup and validates redirect URLs safely', () => {
    expect(sanitizeInput('<script>alert(1)</script><b>ok</b>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;&lt;b&gt;ok&lt;/b&gt;',
    );

    expect(isValidRedirectUrl('/dashboard')).toBe(true);
    expect(isValidRedirectUrl(`${globalThis.location.origin}/settings`)).toBe(true);
    expect(isValidRedirectUrl('//evil.example.com/steal')).toBe(false);
    expect(isValidRedirectUrl('https://evil.example.com/phish')).toBe(false);
    expect(isValidRedirectUrl('javascript:alert(1)')).toBe(false);
  });

  it('tracks suspicious auth behavior and lockout state', () => {
    expect(detectSuspiciousActivity()).toBe(false);

    for (let i = 0; i < 6; i += 1) {
      recordFailedAuthAttempt();
    }

    expect(sessionStorage.getItem('failed_auth_attempts')).toBe('6');
    expect(detectSuspiciousActivity()).toBe(true);
    expect(logSecurityEvent).toHaveBeenCalledWith('auth_failed', { consecutiveFailures: 6 });
    expect(logSecurityEvent).toHaveBeenCalledWith('suspicious_activity', {
      type: 'excessive_failed_attempts',
      count: 6,
    });

    const identifier = 'user@example.com';
    for (let i = 0; i < 5; i += 1) {
      recordLoginAttempt(identifier, false);
    }

    const locked = checkAccountLockout(identifier);
    expect(locked.isLocked).toBe(true);
    expect(locked.remainingTime).toBeGreaterThan(0);

    recordLoginAttempt(identifier, true);
    expect(checkAccountLockout(identifier)).toEqual({ isLocked: false, attemptsRemaining: 5 });
    expect(sessionStorage.getItem('failed_auth_attempts')).toBeNull();

    clearFailedAuthAttempts();
    expect(sessionStorage.getItem('failed_auth_attempts')).toBeNull();
  });

  it('reports remaining attempts and clears expired lockouts', () => {
    const identifier = 'partial-lockout@example.com';
    const key = `lockout_${identifier}`;
    const now = Date.now();

    localStorage.setItem(key, JSON.stringify({ timestamp: now - 60_000, attempts: 2 }));
    expect(checkAccountLockout(identifier)).toEqual({ isLocked: false, attemptsRemaining: 3 });

    localStorage.setItem(key, JSON.stringify({ timestamp: now - 16 * 60 * 1000, attempts: 4 }));
    expect(checkAccountLockout(identifier)).toEqual({ isLocked: false, attemptsRemaining: 5 });
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('generates and verifies HMAC request signatures', async () => {
    const signature = await generateRequestSignature('payload', 'secret');
    expect(signature).toMatch(/^[0-9a-f]+$/);
    expect(signature).toHaveLength(64);

    await expect(verifyRequestSignature('payload', signature, 'secret')).resolves.toBe(true);
    await expect(verifyRequestSignature('payload', signature, 'wrong-secret')).resolves.toBe(false);
  });

  it('initializes security services and handles startup failures gracefully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    sessionStorage.setItem('failed_auth_attempts', '6');
    initializeSecurity();

    expect(getCsrfToken()).toMatch(/^[0-9a-f]{64}$/);
    expect(startGuardianLoops).toHaveBeenCalledTimes(1);
    expect(debugLogger).toHaveBeenCalledWith('initializeSecurity entry');
    expect(debugLogger).toHaveBeenCalledWith('Security initialized successfully');

    startGuardianLoops.mockImplementationOnce(() => {
      throw new Error('guardian failed');
    });
    initializeSecurity();

    expect(debugLogger).toHaveBeenCalledWith(
      'Security initialization error',
      expect.objectContaining({ error: 'guardian failed' }),
    );
    expect(errorSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
