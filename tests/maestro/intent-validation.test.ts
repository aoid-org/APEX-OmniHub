/**
 * MAESTRO Intent Validation Tests
 *
 * Targeted tests for the validateIntent function in the execution engine.
 */

import { describe, it, expect } from 'vitest';
import { validateIntent } from '@/integrations/maestro/execution/engine';
import { createTestIntent } from './__helpers__/test-factories';

describe('MAESTRO validateIntent', () => {
  it('should validate a perfectly valid intent as GREEN', async () => {
    const intent = createTestIntent();
    const result = await validateIntent(intent);

    expect(result.valid).toBe(true);
    expect(result.risk_lane).toBe('GREEN');
    expect(result.errors).toHaveLength(0);
  });

  describe('Idempotency Key Validation', () => {
    it('should reject missing idempotency_key', async () => {
      const intent = createTestIntent({ idempotency_key: '' });
      const result = await validateIntent(intent);

      expect(result.valid).toBe(false);
      expect(result.risk_lane).toBe('RED');
      expect(result.errors[0]).toContain('idempotency_key must match pattern');
    });

    it('should reject malformed idempotency_key', async () => {
      const intent = createTestIntent({ idempotency_key: 'too-short' });
      const result = await validateIntent(intent);

      expect(result.valid).toBe(false);
      expect(result.risk_lane).toBe('RED');
      expect(result.errors[0]).toContain('idempotency_key must match pattern');
    });
  });

  describe('Identity Validation', () => {
    it('should reject intent missing tenant_id', async () => {
      const intent = createTestIntent();
      // @ts-expect-error - testing invalid input
      delete intent.identity.tenant_id;

      const result = await validateIntent(intent);
      expect(result.valid).toBe(false);
      expect(result.risk_lane).toBe('RED');
      expect(result.errors).toContain('Missing required identity fields');
    });

    it('should reject intent missing user_id', async () => {
      const intent = createTestIntent();
      // @ts-expect-error - testing invalid input
      delete intent.identity.user_id;

      const result = await validateIntent(intent);
      expect(result.valid).toBe(false);
      expect(result.risk_lane).toBe('RED');
      expect(result.errors).toContain('Missing required identity fields');
    });

    it('should reject intent missing session_id', async () => {
      const intent = createTestIntent();
      // @ts-expect-error - testing invalid input
      delete intent.identity.session_id;

      const result = await validateIntent(intent);
      expect(result.valid).toBe(false);
      expect(result.risk_lane).toBe('RED');
      expect(result.errors).toContain('Missing required identity fields');
    });

    it('should reject invalid locale format', async () => {
      const intent = createTestIntent({
        identity: {
          tenant_id: 't1',
          user_id: 'u1',
          session_id: 's1',
          locale: 'invalid-locale-format-more-than-3-chars',
        },
      });

      const result = await validateIntent(intent);
      expect(result.valid).toBe(false);
      expect(result.risk_lane).toBe('RED');
      expect(result.errors).toContain('Invalid locale format - must be BCP-47 compliant');
    });
  });

  describe('Confidence Validation', () => {
    it('should reject confidence below 0', async () => {
      const intent = createTestIntent({ confidence: -0.1 });
      const result = await validateIntent(intent);

      expect(result.valid).toBe(false);
      expect(result.risk_lane).toBe('RED');
      expect(result.errors).toContain('Confidence must be between 0 and 1');
    });

    it('should reject confidence above 1', async () => {
      const intent = createTestIntent({ confidence: 1.1 });
      const result = await validateIntent(intent);

      expect(result.valid).toBe(false);
      expect(result.risk_lane).toBe('RED');
      expect(result.errors).toContain('Confidence must be between 0 and 1');
    });
  });

  describe('Injection Warnings (YELLOW lane)', () => {
    it('should flag suspicious patterns as YELLOW', async () => {
      // High special char ratio (> 0.3) triggers a warning (score 50) but not a block (threshold 70)
      const intent = createTestIntent({
        parameters: { message: '!!!@@@###$$$%%%^^^&&&***((()))' }
      });

      const result = await validateIntent(intent);
      expect(result.valid).toBe(true);
      expect(result.risk_lane).toBe('YELLOW');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Suspicious patterns detected: high_special_chars');
    });
  });
});
