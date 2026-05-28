/**
 * APEX-OmniHub iframe Origin Policy Tests
 */

import { describe, it, expect } from 'vitest';
import { sanitiseIframeUrl, getSandboxAttribute, SANDBOX_PROFILES } from '../../src/lib/iframeOriginPolicy';

describe('iframeOriginPolicy', () => {

  describe('sanitiseIframeUrl — Fail-Closed Blocks', () => {
    it('blocks empty / nullish URLs', () => {
      expect(sanitiseIframeUrl('').allowed).toBe(false);
      expect(sanitiseIframeUrl(null).allowed).toBe(false);
      expect(sanitiseIframeUrl(undefined).allowed).toBe(false);
      expect(sanitiseIframeUrl('   ').allowed).toBe(false);
    });

    it('blocks non-HTTPS protocols immediately', () => {
      const res1 = sanitiseIframeUrl('http://www.youtube.com');
      expect(res1.allowed).toBe(false);
      expect(res1.reason).toContain('Non-HTTPS');

      const res2 = sanitiseIframeUrl('ftp://files.apexbusiness.ca');
      expect(res2.allowed).toBe(false);
    });

    it('blocks dangerous schema prefixes (javascript:, data:, file:)', () => {
      const payloads = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(document.cookie)',
        'data:text/html,<script>alert(1)</script>',
        'blob:https://app.apexbusiness.ca/1234-5678',
        'file:///etc/passwd',
        'about:blank',
        'vbscript:msgbox("hello")',
        'ws://localhost:8080',
      ];

      for (const payload of payloads) {
        const res = sanitiseIframeUrl(payload);
        expect(res.allowed).toBe(false);
        expect(res.reason).toContain('Blocked protocol');
      }
    });

    it('blocks unparseable / malformed URLs', () => {
      const res = sanitiseIframeUrl('not-a-valid-url at all');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Malformed URL');
    });

    it('blocks private / internal IP ranges and loopback', () => {
      const malicious = [
        'https://localhost',
        'https://127.0.0.1/admin',
        'https://10.0.0.1/internal-api',
        'https://172.16.5.5/grafana',
        'https://192.168.1.1/router',
        'https://[::1]/ipv6-loopback'
      ];

      for (const payload of malicious) {
        const res = sanitiseIframeUrl(payload);
        expect(res.allowed).toBe(false);
        expect(res.reason).toContain('Private/internal network');
      }
    });

    it('blocks unknown public origins (fail-closed)', () => {
      const res = sanitiseIframeUrl('https://evil.com/phishing');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Unknown origin not in allowlist');
    });
  });

  describe('sanitiseIframeUrl — Allowed Origins', () => {
    it('allows first-party origins and assigns first-party profile', () => {
      const res = sanitiseIframeUrl('https://omnihub.apexbusiness.ca/module/123');
      expect(res.allowed).toBe(true);
      expect(res.profile).toBe('first-party');
    });

    it('allows trusted partner origins and assigns trusted-partner profile', () => {
      const res = sanitiseIframeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(res.allowed).toBe(true);
      expect(res.profile).toBe('trusted-partner');
    });

    it('handles demo origins correctly based on isDemoMode flag', () => {
      const url = 'https://demo.apexbusiness.ca/showcase';
      
      // Blocked in production (default)
      const prodRes = sanitiseIframeUrl(url, false);
      expect(prodRes.allowed).toBe(false);
      expect(prodRes.reason).toContain('blocked in production');

      // Allowed in demo mode
      const demoRes = sanitiseIframeUrl(url, true);
      expect(demoRes.allowed).toBe(true);
      expect(demoRes.profile).toBe('trusted-partner');
    });
  });

  describe('getSandboxAttribute', () => {
    it('returns restrictive untrusted profile for null', () => {
      const attr = getSandboxAttribute(null);
      expect(attr).toBe('allow-scripts');
      expect(attr).not.toContain('allow-same-origin');
    });

    it('returns exact profile matches', () => {
      expect(getSandboxAttribute('untrusted')).toBe(SANDBOX_PROFILES['untrusted']);
      expect(getSandboxAttribute('trusted-partner')).toBe(SANDBOX_PROFILES['trusted-partner']);
      expect(getSandboxAttribute('first-party')).toBe(SANDBOX_PROFILES['first-party']);
    });
  });
});
