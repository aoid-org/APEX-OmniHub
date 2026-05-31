const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const TRACE_ID_PREFIX = 'cfg-';
const TRACE_ID_LENGTH = 8;

let fallbackCounter = 0;

function normalizeTraceIdSegment(value: string): string {
  return value.replaceAll(/[^a-z0-9]/gi, '').toLowerCase().slice(0, TRACE_ID_LENGTH);
}

function createFallbackTraceId(): string {
  fallbackCounter = (fallbackCounter + 1) % 46656;
  const timePart = Date.now().toString(36).slice(-5);
  const counterPart = fallbackCounter.toString(36).padStart(3, '0');
  const traceId = normalizeTraceIdSegment(timePart + counterPart).padEnd(TRACE_ID_LENGTH, '0');
  return TRACE_ID_PREFIX + traceId;
}

export function hasValidSupabaseUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol === 'https:') {
      return true;
    }

    return parsedUrl.protocol === 'http:' && LOOPBACK_HOSTNAMES.has(parsedUrl.hostname);
  } catch {
    return false;
  }
}

export type SupabaseBrowserKeyKind = 'missing' | 'jwt' | 'publishable' | 'anon' | 'secret' | 'invalid';

const SUPABASE_HOST_SUFFIX = '.supabase.co';

function hasPrefixedValue(key: string, prefix: string): boolean {
  return key.startsWith(prefix) && key.length > prefix.length;
}

export function decodeSupabaseJwtPayload(key: string): Record<string, unknown> | null {
  const parts = key.split('.');
  const payload = parts[1];

  if (parts.length !== 3 || !payload || typeof globalThis.atob !== 'function') {
    return null;
  }

  try {
    const base64 = payload.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    return JSON.parse(globalThis.atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getSupabaseBrowserKeyKind(key: string): SupabaseBrowserKeyKind {
  const trimmedKey = key.trim();

  if (!trimmedKey) return 'missing';
  if (hasPrefixedValue(trimmedKey, 'sb_secret_') || trimmedKey.toLowerCase().includes('service_role')) return 'secret';
  if (hasPrefixedValue(trimmedKey, 'sb_publishable_')) return 'publishable';
  if (hasPrefixedValue(trimmedKey, 'sb_anon_')) return 'anon';

  if (trimmedKey.startsWith('eyJ')) {
    const payload = decodeSupabaseJwtPayload(trimmedKey);
    if (!payload) return 'invalid';
    // Supabase legacy service-role JWTs must never be accepted by browser config.
    if (payload.role === 'service_role') return 'secret';
    return 'jwt';
  }

  return 'invalid';
}

export function isBrowserSafeSupabaseKey(key: string): boolean {
  const kind = getSupabaseBrowserKeyKind(key);
  return kind === 'jwt' || kind === 'publishable' || kind === 'anon';
}

export function getSupabaseProjectRefFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url.trim());
    const hostname = parsedUrl.hostname.toLowerCase();

    if (!hostname.endsWith(SUPABASE_HOST_SUFFIX)) return '';

    return hostname.slice(0, -SUPABASE_HOST_SUFFIX.length);
  } catch {
    return '';
  }
}

export function getSupabaseJwtProjectRef(key: string): string {
  const payload = decodeSupabaseJwtPayload(key.trim());
  const ref = payload?.ref;

  return typeof ref === 'string' ? ref.toLowerCase() : '';
}

export function doesSupabaseKeyMatchUrl(url: string, key: string): boolean {
  const keyKind = getSupabaseBrowserKeyKind(key);

  if (!isBrowserSafeSupabaseKey(key)) return false;
  if (keyKind !== 'jwt') return true;

  const urlProjectRef = getSupabaseProjectRefFromUrl(url);
  const keyProjectRef = getSupabaseJwtProjectRef(key);

  // Legacy JWT anon keys include a `ref` claim; reject cross-project URL/key pairs before Supabase returns 401.
  return Boolean(urlProjectRef && keyProjectRef && urlProjectRef === keyProjectRef);
}

export function hasSupabaseConfigValue(url: string, anonKey: string): boolean {
  const trimmedUrl = url.trim();
  const trimmedKey = anonKey.trim();

  return hasValidSupabaseUrl(trimmedUrl) && doesSupabaseKeyMatchUrl(trimmedUrl, trimmedKey);
}

export function createSupabaseConfigTraceId(): string {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === 'function') {
    const traceId = normalizeTraceIdSegment(cryptoApi.randomUUID());

    if (traceId.length > 0) {
      return `${TRACE_ID_PREFIX}${traceId}`;
    }
  }

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(TRACE_ID_LENGTH));
    const traceId = Array.from(bytes, (byte) => (byte % 36).toString(36)).join('');
    return `${TRACE_ID_PREFIX}${traceId}`;
  }

  return createFallbackTraceId();
}
