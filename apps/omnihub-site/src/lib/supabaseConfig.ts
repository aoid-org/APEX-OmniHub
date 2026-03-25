const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[(.*)\]$/, '$1').toLowerCase();
}

function getSecureCrypto(): Crypto {
  if (globalThis.crypto) {
    return globalThis.crypto;
  }

  throw new Error('Secure Web Crypto API is required for Supabase trace IDs.');
}

export function hasValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') {
      return true;
    }

    return (
      parsed.protocol === 'http:' &&
      LOOPBACK_HOSTNAMES.has(normalizeHostname(parsed.hostname))
    );
  } catch {
    return false;
  }
}

export function hasSupabaseConfigValue(url: string, anonKey: string): boolean {
  return hasValidSupabaseUrl(url) && anonKey.length > 0;
}

export function createSupabaseConfigTraceId(): string {
  const cryptoApi = getSecureCrypto();
  if (typeof cryptoApi.randomUUID === 'function') {
    return `cfg-${cryptoApi.randomUUID().replace(/-/g, '').slice(0, 8).toLowerCase()}`;
  }

  const bytes = new Uint8Array(4);
  cryptoApi.getRandomValues(bytes);
  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `cfg-${suffix}`;
}
