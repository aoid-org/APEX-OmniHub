import { describe, it, expect } from 'vitest';
import { sanitizeEventPayload } from '../../src/omniconnect/utils/validation';

describe('sanitizeEventPayload', () => {
  // =========================================================================
  // TIER 1: Complete Redaction (Security Critical)
  // =========================================================================

  describe('Tier 1 - Complete Redaction', () => {
    it('redacts password fields completely', () => {
      const input = { password: 'secret123', username: 'john' };
      const output = sanitizeEventPayload(input);

      expect(output.password).toBe('[REDACTED]');
      expect(output.username).toBe('john'); // Unaffected
    });

    it('redacts API keys and tokens', () => {
      const input = {
        api_key: 'sk-abc123',
        access_token: 'eyJhbGc...',
        user: 'test',
      };
      const output = sanitizeEventPayload(input);

      expect(output.api_key).toBe('[REDACTED]');
      expect(output.access_token).toBe('[REDACTED]');
      expect(output.user).toBe('test');
    });

    it('handles case-insensitive key matching', () => {
      const input = { PASSWORD: 'secret', Password: 'secret2' };
      const output = sanitizeEventPayload(input);

      expect(output.PASSWORD).toBe('[REDACTED]');
      expect(output.Password).toBe('[REDACTED]');
    });
  });

  // =========================================================================
  // TIER 2: Partial Masking (Preserve Format)
  // =========================================================================

  describe('Tier 2 - Partial Masking', () => {
    it('masks email addresses partially', () => {
      const input = { email: 'test@example.com' };
      const output = sanitizeEventPayload(input);

      expect(output.email).toMatch(/^te\*\*\*om$/);
    });

    it('masks SSN with first/last 2 digits visible', () => {
      const input = { ssn: '123-45-6789' };
      const output = sanitizeEventPayload(input);

      expect(output.ssn).toMatch(/^12\*\*\*89$/);
    });

    it('masks credit card numbers', () => {
      const input = { credit_card: '1234-5678-9012-3456' };
      const output = sanitizeEventPayload(input);

      expect(output.credit_card).toMatch(/^12\*\*\*56$/);
    });

    it('redacts very short values completely (too short to mask safely)', () => {
      const input = { ssn: '12345' }; // Only 5 chars
      const output = sanitizeEventPayload(input);

      expect(output.ssn).toBe('[REDACTED]');
    });
  });

  // =========================================================================
  // TIER 3: Contextual Masking (Analytics Friendly)
  // =========================================================================

  describe('Tier 3 - Contextual Masking', () => {
    it('masks last octet of IP addresses', () => {
      const input = { ip_address: '192.168.1.42' };
      const output = sanitizeEventPayload(input);

      expect(output.ip_address).toBe('192.168.1.xxx');
    });

    it('masks session IDs with prefix/suffix visible', () => {
      const input = { session_id: 'sess_abc123def456ghi789' };
      const output = sanitizeEventPayload(input);

      expect(output.session_id).toMatch(/^sess_abc\*\*\*i789$/);
    });
  });

  // =========================================================================
  // PII PATTERN DETECTION (String Scanning)
  // =========================================================================

  describe('PII Pattern Detection', () => {
    it('detects and redacts email addresses in arbitrary strings', () => {
      const input = { message: 'Contact me at john.doe@example.com for help' };
      const output = sanitizeEventPayload(input);

      expect(output.message).not.toContain('john.doe@example.com');
      expect(output.message).toContain('[EMAIL_REDACTED]');
    });

    it('detects and redacts phone numbers', () => {
      const input = { note: 'Call me at 555-123-4567' };
      const output = sanitizeEventPayload(input);

      expect(output.note).not.toContain('555-123-4567');
      expect(output.note).toContain('[PHONE_REDACTED]');
    });

    it('detects and redacts credit card patterns', () => {
      const input = { data: 'Card: 1234 5678 9012 3456' };
      const output = sanitizeEventPayload(input);

      expect(output.data).not.toContain('1234 5678 9012 3456');
      expect(output.data).toContain('[CARD_REDACTED]');
    });

    it('detects and redacts SSN patterns', () => {
      const input = { text: 'SSN is 123-45-6789' };
      const output = sanitizeEventPayload(input);

      expect(output.text).not.toContain('123-45-6789');
      expect(output.text).toContain('[SSN_REDACTED]');
    });

    it('partially masks IP addresses in strings', () => {
      const input = { log: 'Request from 192.168.1.42' };
      const output = sanitizeEventPayload(input);

      expect(output.log).toContain('192.168.1.xxx');
      expect(output.log).not.toContain('192.168.1.42');
    });
  });

  // =========================================================================
  // RECURSIVE TRAVERSAL
  // =========================================================================

  describe('Nested Object Handling', () => {
    it('sanitizes deeply nested objects', () => {
      const input = {
        user: {
          profile: {
            contact: {
              email: 'test@example.com',
              password: 'secret123',
            },
          },
        },
      };

      const output = sanitizeEventPayload(input);

      expect((output.user as any).profile.contact.email).toMatch(/^te\*\*\*om$/);
      expect((output.user as any).profile.contact.password).toBe('[REDACTED]');
    });

    it('sanitizes arrays of objects', () => {
      const input = {
        users: [
          { email: 'user1@example.com', password: 'pass1' },
          { email: 'user2@example.com', password: 'pass2' },
        ],
      };

      const output = sanitizeEventPayload(input);

      expect((output.users as any)[0].password).toBe('[REDACTED]');
      expect((output.users as any)[1].password).toBe('[REDACTED]');
      expect((output.users as any)[0].email).toMatch(/^us\*\*\*om$/);
    });

    it('handles arrays of primitive strings with PII', () => {
      const input = {
        messages: [
          'Email me at test@example.com',
          'Call 555-123-4567',
        ],
      };

      const output = sanitizeEventPayload(input);

      expect((output.messages as any)[0]).toContain('[EMAIL_REDACTED]');
      expect((output.messages as any)[1]).toContain('[PHONE_REDACTED]');
    });
  });

  // =========================================================================
  // CIRCUIT BREAKERS (DoS Protection)
  // =========================================================================

  describe('Circuit Breakers', () => {
    it('prevents infinite recursion with max depth limit', () => {
      // Create deeply nested object (15 levels)
      let deep: any = { value: 'bottom' };
      for (let i = 0; i < 15; i++) {
        deep = { nested: deep };
      }

      const output = sanitizeEventPayload(deep);

      // Should truncate at max depth and show error
      let current: any = output;
      let depth = 0;
      while (current.nested && depth < 20) {
        current = current.nested;
        depth++;
      }

      expect(depth).toBeLessThanOrEqual(11); // Max depth + 1 for error
    });

    it('handles wide objects with many keys', () => {
      // Create object with 1500 keys
      const wide: Record<string, unknown> = {};
      for (let i = 0; i < 1500; i++) {
        wide[`key${i}`] = `value${i}`;
      }

      const output = sanitizeEventPayload(wide);

      // Should handle gracefully (may truncate or show error)
      expect(output).toBeDefined();
    });

    it('skips PII scan for very long strings', () => {
      const huge = 'x'.repeat(20000); // 20KB string
      const input = { data: huge };

      const start = performance.now();
      const output = sanitizeEventPayload(input);
      const duration = performance.now() - start;

      // Should complete quickly without scanning
      expect(duration).toBeLessThan(10); // <10ms
      expect(output.data).toBe(huge); // Unchanged
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles null values', () => {
      const input = { value: null };
      const output = sanitizeEventPayload(input);

      expect(output.value).toBeNull();
    });

    it('handles undefined values', () => {
      const input = { value: undefined };
      const output = sanitizeEventPayload(input);

      expect(output.value).toBeUndefined();
    });

    it('handles empty objects', () => {
      const input = {};
      const output = sanitizeEventPayload(input);

      expect(output).toEqual({});
    });

    it('handles empty arrays', () => {
      const input = { items: [] };
      const output = sanitizeEventPayload(input);

      expect(output.items).toEqual([]);
    });

    it('handles numbers and booleans', () => {
      const input = { count: 42, active: true, rate: 3.14 };
      const output = sanitizeEventPayload(input);

      expect(output.count).toBe(42);
      expect(output.active).toBe(true);
      expect(output.rate).toBe(3.14);
    });

    it('handles special characters in keys', () => {
      const input = { 'user:email': 'test@example.com' };
      const output = sanitizeEventPayload(input);

      expect(output['user:email']).toMatch(/^te\*\*\*om$/);
    });
  });

  // =========================================================================
  // PERFORMANCE
  // =========================================================================

  describe('Performance', () => {
    it('completes in <5ms for typical payloads', () => {
      const input = {
        user: { email: 'test@example.com', name: 'John' },
        session: { id: 'sess_123' },
        metadata: { timestamp: Date.now() },
      };

      const start = performance.now();
      sanitizeEventPayload(input);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });
  });
});
