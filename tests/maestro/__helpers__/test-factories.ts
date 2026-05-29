/**
 * Test factories and helpers for MAESTRO tests
 */

import type { MaestroIntent, MaestroIdentity, InjectionDetectionResult } from '@/integrations/maestro/types';
import { expect } from 'vitest';

/**
 * Generate a valid 64-character hex idempotency key
 */
export function generateIdempotencyKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a valid UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Create a valid test identity
 */
export function createTestIdentity(overrides: Partial<MaestroIdentity> = {}): MaestroIdentity {
  return {
    tenant_id: generateUUID(),
    user_id: generateUUID(),
    session_id: generateUUID(),
    locale: 'en-US',
    ...overrides,
  };
}

/**
 * Create a valid test intent
 */
export function createTestIntent(overrides: Partial<MaestroIntent> = {}): MaestroIntent {
  return {
    intent_id: generateUUID(),
    idempotency_key: generateIdempotencyKey(),
    action: 'log_message',
    parameters: { message: 'Test message' },
    identity: createTestIdentity(),
    translation_status: 'COMPLETED',
    confidence: 0.95,
    user_confirmed: true,
    ...overrides,
  };
}

/**
 * Assert that an injection was detected and blocked
 */
export function expectInjectionBlocked(
  result: InjectionDetectionResult,
  expectedPattern?: string
) {
  expect(result.detected).toBe(true);
  expect(result.blocked).toBe(true);
  if (expectedPattern) {
    expect(result.patterns_matched).toContain(expectedPattern);
  }
}

/**
 * Assert that an injection was detected but not blocked (warning only)
 */
export function expectInjectionWarning(
  result: InjectionDetectionResult,
  expectedPattern?: string
) {
  expect(result.detected).toBe(true);
  expect(result.blocked).toBe(false);
  if (expectedPattern) {
    expect(result.patterns_matched).toContain(expectedPattern);
  }
}

/**
 * Assert that no injection was detected
 */
export function expectNoInjection(result: InjectionDetectionResult) {
  expect(result.detected).toBe(false);
  expect(result.blocked).toBe(false);
  expect(result.patterns_matched).toHaveLength(0);
}
