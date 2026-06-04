import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi, afterEach } from 'vitest';
import corsWorker, {
  MAX_UPSTREAM_BYTES,
  isAllowedOrigin,
  validateTargetUrl,
} from '../../edge/cors-proxy/edge-cors-proxy.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function runEnvGuard(env: Record<string, string | undefined>) {
  return spawnSync(process.execPath, ['scripts/check-env-root.mjs'], {
    cwd: process.cwd(),
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf8',
  });
}

describe('Supabase browser config fails closed', () => {
  it('missing Supabase env exits non-zero in CI', () => {
    const result = runEnvGuard({ CI: 'true', NODE_ENV: 'production' });
    expect(result.status).toBe(1);
    expect(result.stderr + result.stdout).toContain('Failing closed');
  });

  it('valid Supabase env passes without logging secret values', () => {
    const key = 'sb_publishable_test_1234567890';
    const result = runEnvGuard({
      CI: 'true',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: key,
    });

    expect(result.status).toBe(0);
    expect(result.stderr + result.stdout).toContain('Environment variables OK');
    expect(result.stderr + result.stdout).not.toContain(key);
  });

  it('client source contains no hardcoded real fallback Supabase project or publishable key', () => {
    const source = readFileSync('apps/omnihub-site/src/lib/supabase.ts', 'utf8');
    expect(source).not.toContain('rtopreovkywofgwgmozi.supabase.co');
    expect(source).not.toContain('sb_publishable_fhOZZrH8blDisp915SKTaw_GswiPZpk');
    expect(source).toContain('VITE_SUPABASE_PUBLISHABLE_KEY');
    expect(source).toContain('VITE_SUPABASE_ANON_KEY');
  });
});

describe('Cloudflare CORS proxy SSRF and origin hardening', () => {
  it('rejects non-HTTPS source URLs', () => {
    expect(validateTargetUrl('http://media.example/video.mp4')).toMatchObject({ ok: false });
  });

  it('rejects localhost, private, and metadata targets', () => {
    for (const target of [
      'https://localhost/file.mp4',
      'https://127.0.0.1/file.mp4',
      'https://10.0.0.1/file.mp4',
      'https://192.168.1.1/file.mp4',
      'https://169.254.169.254/latest/meta-data',
      'https://metadata.google.internal/computeMetadata/v1',
      'https://8.8.8.8/file.mp4',
      'https://[2001:4860:4860::8888]/file.mp4',
    ]) {
      expect(validateTargetUrl(target)).toMatchObject({ ok: false });
    }
  });

  it('rejects unapproved origins', async () => {
    const response = await corsWorker.fetch(new Request('https://cors.apexomnihub.icu/?source=https%3A%2F%2Fmedia.example%2Fa.mp4', {
      headers: { Origin: 'https://evil.example' },
    }));

    expect(response.status).toBe(403);
    expect(isAllowedOrigin('https://evil.example')).toBe(false);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('accepts an approved HTTPS media target and preserves Range', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', {
      status: 206,
      headers: { 'Content-Length': '2', 'Content-Range': 'bytes 0-1/2', 'Set-Cookie': 'sid=upstream' },
    }));

    const response = await corsWorker.fetch(new Request('https://cors.apexomnihub.icu/?source=https%3A%2F%2Fmedia.example%2Fa.mp4', {
      headers: { Origin: 'https://apexomnihub.icu', Range: 'bytes=0-1' },
    }));

    expect(response.status).toBe(206);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://apexomnihub.icu');
    expect(response.headers.get('Set-Cookie')).toBeNull();
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Range: 'bytes=0-1' });
  });

  it('rejects unsafe upstream redirects', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, {
      status: 302,
      headers: { Location: 'http://169.254.169.254/latest/meta-data' },
    }));

    const response = await corsWorker.fetch(new Request('https://cors.apexomnihub.icu/?source=https%3A%2F%2Fmedia.example%2Fa.mp4', {
      headers: { Origin: 'https://apexomnihub.icu' },
    }));

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Unsafe upstream redirect');
  });

  it('caps oversized upstream content-length', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('too large', {
      status: 200,
      headers: { 'Content-Length': String(MAX_UPSTREAM_BYTES + 1) },
    }));

    const response = await corsWorker.fetch(new Request('https://cors.apexomnihub.icu/?source=https%3A%2F%2Fmedia.example%2Fa.mp4', {
      headers: { Origin: 'https://apexomnihub.icu' },
    }));

    expect(response.status).toBe(413);
  });
});

describe('service worker sensitive traffic and notification URL hardening', () => {
  const source = readFileSync('apps/omnihub-site/public/sw.js', 'utf8');

  it('bypasses cache for Supabase and Supabase REST/RPC/Edge Function paths', () => {
    expect(source).toContain("url.hostname.endsWith('.supabase.co')");
    expect(source).toContain("url.pathname.startsWith('/rest/v1')");
    expect(source).toContain("url.pathname.startsWith('/rpc')");
    expect(source).toContain("url.pathname.startsWith('/functions/v1')");
    expect(source).not.toContain('CACHE_API');
  });

  it('bypasses cache for /api/* while preserving static asset caching', () => {
    expect(source).toContain("url.pathname.startsWith('/api/')");
    expect(source).toContain('STATIC_ASSETS.includes(url.pathname)');
    expect(source).toContain('CACHE_STATIC');
  });

  it('blocks external, javascript, data, and malformed notification URLs by same-origin canonicalization', () => {
    expect(source).toContain('function safeAppUrl(input)');
    expect(source).toContain('parsed.origin !== self.location.origin');
    expect(source).toContain("parsed.protocol !== 'https:' && parsed.protocol !== 'http:'");
    expect(source).toContain('return fallback.href');
  });

  it('allows valid canonical routes and maps legacy notification actions safely', () => {
    expect(source).toContain("['/integrations', '/integrations/web3']");
    expect(source).toContain("['/omnitrace', '/omnidash']");
    expect(source).toContain("'/omnidash'");
    expect(source).toContain("'/integrations/web3'");
    expect(source).toContain('clients.openWindow(safeUrl)');
    expect(source).not.toContain('clients.openWindow(url)');
  });
});

describe('Web3 nonce chain binding', () => {
  it('creates/reuses nonces scoped by chain_id', () => {
    const source = readFileSync('supabase/functions/web3-nonce/index.ts', 'utf8').replace(/\r\n/g, '\n');
    expect(source).toContain('const { wallet_address, chain_id } = body');
    expect(source).toContain('const resolvedChainId = Number.isInteger(chain_id) && chain_id > 0 ? chain_id : 1');
    expect(source).toContain(".eq('wallet_address', normalizedAddress)\n      .eq('chain_id', resolvedChainId)");
    expect(source).toContain('chain_id: resolvedChainId');
  });

  it('verifies and consumes nonces scoped by nonce, wallet_address, and chain_id', () => {
    const source = readFileSync('supabase/functions/web3-verify/index.ts', 'utf8').replace(/\r\n/g, '\n');
    expect(source).toContain(".eq('nonce', messageNonce)\n      .eq('wallet_address', normalizedAddress)\n      .eq('chain_id', resolvedChainId)");
    expect(source).toContain("reason: 'typed_data_only_unsupported'");
    expect(source).toContain("error: 'unsupported_verification_type'");
  });
});
