import { describe, expect, it } from 'vitest';
import {
  validateWebhookUrl,
  validateRedirectTarget,
} from '../../supabase/functions/_shared/ssrf-protection';

describe('ssrf-protection', () => {
  it('allows public https URL when dns resolves to public ip', async () => {
    const result = await validateWebhookUrl('https://hooks.example.com/path', {
      allowlistHosts: ['example.com'],
      dnsResolver: async () => ['93.184.216.34'],
    });

    expect(result.hostname).toBe('hooks.example.com');
  });

  it('rejects non-https urls', async () => {
    await expect(
      validateWebhookUrl('http://hooks.example.com/path', {
        allowlistHosts: ['example.com'],
        dnsResolver: async () => ['93.184.216.34'],
      })
    ).rejects.toThrow(/must use https/i);
  });

  it('rejects when allowlist is not configured', async () => {
    await expect(
      validateWebhookUrl('https://hooks.example.com/path', {
        allowlistHosts: [],
        dnsResolver: async () => ['93.184.216.34'],
      })
    ).rejects.toThrow(/allowlist is not configured/i);
  });

  it('blocks private dns resolution', async () => {
    await expect(
      validateWebhookUrl('https://hooks.example.com/path', {
        allowlistHosts: ['example.com'],
        dnsResolver: async () => ['10.0.0.9'],
      })
    ).rejects.toThrow(/blocked IP/i);
  });

  it('blocks ipv6 loopback literal', async () => {
    await expect(
      validateWebhookUrl('https://[::1]/x', {
        allowlistHosts: ['::1'],
      })
    ).rejects.toThrow(/blocked internal IP/i);
  });

  it('blocks host outside allowlist', async () => {
    await expect(
      validateWebhookUrl('https://evil.com/path', {
        allowlistHosts: ['example.com'],
        dnsResolver: async () => ['93.184.216.34'],
      })
    ).rejects.toThrow(/allowlist/i);
  });

  it('validates redirect target against dns and allowlist', async () => {
    const base = new URL('https://hooks.example.com/in');
    const redirect = await validateRedirectTarget('/next', base, {
      allowlistHosts: ['example.com'],
      dnsResolver: async () => ['93.184.216.34'],
    });

    expect(redirect.toString()).toBe('https://hooks.example.com/next');
  });
});
