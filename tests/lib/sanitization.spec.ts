import { describe, it, expect } from 'vitest';
import {
  sanitizeEventPayload,
  stripPii,
  redactAmount,
} from '@/lib/sanitization';

describe('sanitizeEventPayload', () => {
  describe('Tier 1: Security-Critical PII', () => {
    it('should redact email addresses', () => {
      const input = { message: 'Contact john@example.com for info' };
      const result = sanitizeEventPayload(input);
      expect(result.message).toBe('Contact [REDACTED] for info');
    });

    it('should redact phone numbers', () => {
      const input = { phone: 'Call me at (555) 123-4567' };
      const result = sanitizeEventPayload(input);
      expect(result.phone).toBe('Call me at [REDACTED]');
    });

    it('should redact SSNs', () => {
      const input = { ssn: 'SSN: 123-45-6789' };
      const result = sanitizeEventPayload(input);
      expect(result.ssn).toBe('SSN: [REDACTED]');
    });

    it('should redact API keys in field names', () => {
      const input = { apiKey: 'secret_key_12345', api_key: 'another_key' };
      const result = sanitizeEventPayload(input);
      expect(result.apiKey).toBe('[REDACTED]');
      expect(result.api_key).toBe('[REDACTED]');
    });

    it('should redact IPv4 addresses', () => {
      const input = { log: 'Request from 192.168.1.1' };
      const result = sanitizeEventPayload(input);
      expect(result.log).toBe('Request from [REDACTED]');
    });
  });

  describe('Tier 2: Financial Data', () => {
    it('should bucket dollar amounts', () => {
      const input = { note: 'Invoice for $1,234.56' };
      const result = sanitizeEventPayload(input);
      expect(result.note).toBe('Invoice for [BUCKETED]');
    });

    it('should bucket amounts correctly', () => {
      expect(redactAmount(100)).toBe('<$250');
      expect(redactAmount(300)).toBe('$250-$500');
      expect(redactAmount(750)).toBe('$500-$1k');
      expect(redactAmount(3000)).toBe('$1k-$5k');
      expect(redactAmount(15000)).toBe('$10k+');
    });
  });

  describe('Circuit Breakers', () => {
    it('should handle deep nesting (max depth 10)', () => {
      // Create object with depth 15
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let deep: any = { value: 'test' };
      for (let i = 0; i < 15; i++) {
        deep = { nested: deep };
      }

      const result = sanitizeEventPayload(deep);
      // Should truncate at depth 10 - we expect a result, not a crash
      expect(result).toBeDefined();
    });

    it('should handle excessive keys (max 1000)', () => {
      const large: Record<string, string> = {};
      for (let i = 0; i < 2000; i++) {
        large[`key${i}`] = `value${i}`;
      }

      const result = sanitizeEventPayload(large);
      // Should return empty object (fail-secure) because the key limit is exceeded
      // The key count check happens inside the loop, and if it exceeds, it sets circuitTripped = true.
      // The public API checks circuitTripped and returns {} if true.
      expect(Object.keys(result).length).toBe(0);
    });

    it('should handle large strings (10KB limit)', () => {
      const largeString = 'x'.repeat(20 * 1024); // 20KB
      const input = { data: largeString };

      const result = sanitizeEventPayload(input);
      // Circuit breaker tripped -> fail secure -> empty object
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('Recursive Sanitization', () => {
    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: 'John',
          email: 'john@example.com',
          profile: {
            phone: '555-123-4567',
          },
        },
      };

      const result = sanitizeEventPayload(input);
      expect(result.user.email).toBe('[REDACTED]');
      expect(result.user.profile.phone).toBe('[REDACTED]');
    });

    it('should sanitize arrays', () => {
      const input = {
        contacts: [
          { email: 'john@example.com' },
          { email: 'jane@example.com' },
        ],
      };

      const result = sanitizeEventPayload(input);
      expect(result.contacts[0].email).toBe('[REDACTED]');
      expect(result.contacts[1].email).toBe('[REDACTED]');
    });
  });

  describe('ReDoS Resistance', () => {
    it('should handle pathological regex input', () => {
      // Pathological case for naive email regex
      const pathological = 'a'.repeat(1000) + '@' + 'b'.repeat(1000) + '.com';
      const input = { data: pathological };

      const start = Date.now();
      sanitizeEventPayload(input);
      const duration = Date.now() - start;

      // Should complete in reasonable time (<100ms)
      expect(duration).toBeLessThan(100);
    });
  });
});

describe('stripPii', () => {
  it('should strip PII from plain text', () => {
    const text = 'Email john@example.com or call (555) 123-4567';
    const result = stripPii(text);
    expect(result).not.toContain('john@example.com');
    expect(result).not.toContain('555');
  });
});
