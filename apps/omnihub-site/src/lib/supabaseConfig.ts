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

export function hasSupabaseConfigValue(url: string, anonKey: string): boolean {
  return hasValidSupabaseUrl(url) && anonKey.length > 0;
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
