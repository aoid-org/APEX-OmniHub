/**
 * Thin server-side Lovable client. Do NOT import this in browser code.
 */

import { calculateBackoffDelay } from '@/lib/backoff';
import type {
  AuditEventPayload,
  DeviceInfo,
  DeviceRegistryResponse,
  LovableClientConfig,
  LovableRequestOptions,
} from './types';

function getEnv(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env?.[name]) {
    return process.env[name];
  }
  // For environments where process.env is shimmed (e.g., serverless bundlers)
  return (import.meta as unknown as Record<string, Record<string, string>>)?.env?.[name];
}

function getConfig(): LovableClientConfig | null {
  const baseUrl = getEnv('LOVABLE_API_BASE') ?? '';
  const apiKey = getEnv('LOVABLE_API_KEY') ?? '';
  const serviceRoleKey = getEnv('LOVABLE_SERVICE_ROLE_KEY');

  if (!baseUrl || !apiKey) {
    // Graceful degradation: return null if not configured (enterprise-ready resilience)
    // Log warning in development to help with debugging
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      console.warn(
        '⚠️ Lovable API not configured. Missing:',
        !baseUrl ? 'LOVABLE_API_BASE' : '',
        !apiKey ? 'LOVABLE_API_KEY' : ''
      );
    }
    return null;
  }

  return { baseUrl, apiKey, serviceRoleKey };
}

type AttemptConfig = {
  baseUrl: string;
  apiKey: string;
  serviceRoleKey?: string;
};

type AttemptOptions = {
  path: string;
  body?: unknown;
  method: string;
  signal?: AbortSignal;
  baseDelayMs: number;
  maxDelayMs: number;
};

/**
 * Execute a single request attempt. Returns the parsed response on success.
 * Throws on non-retryable failure. Returns `{ retry: true, error }` for 5xx.
 */
async function attemptRequest<T>(
  config: AttemptConfig,
  options: AttemptOptions,
): Promise<{ ok: true; value: T | undefined } | { ok: false; error: unknown; retryable: boolean }> {
  const { baseUrl, apiKey, serviceRoleKey } = config;
  const { path, body, method, signal } = options;

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(serviceRoleKey ? { 'X-Service-Role': serviceRoleKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const error = new Error(`Lovable request failed (${response.status}): ${text}`);
      return { ok: false, error, retryable: response.status >= 500 };
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return { ok: true, value: (await response.json()) as T };
    }
    return { ok: true, value: undefined as T };
  } catch (error) {
    return { ok: false, error, retryable: true };
  }
}

async function requestLovable<T>(options: LovableRequestOptions): Promise<T | undefined> {
  const config = getConfig();
  if (!config) {
    // Graceful degradation: return undefined if not configured (idempotent, non-blocking)
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      console.warn('⚠️ Lovable request skipped: API not configured');
    }
    return undefined;
  }
  const {
    path,
    body,
    method = 'POST',
    signal,
    maxAttempts = 5,
    baseDelayMs = 500,
    maxDelayMs = 10_000,
  } = options;

  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt += 1;
    const result = await attemptRequest<T>(config, {
      path, body, method, signal, baseDelayMs, maxDelayMs,
    });

    if (result.ok) {
      return result.value;
    }

    lastError = result.error;
    if (!result.retryable || attempt >= maxAttempts) break;
    const delay = calculateBackoffDelay(attempt, {
      baseMs: baseDelayMs,
      maxMs: maxDelayMs,
    });
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown Lovable client error');
}

export async function postAuditEvent(payload: AuditEventPayload, signal?: AbortSignal): Promise<void> {
  await requestLovable<void>({
    path: '/audit-events',
    method: 'POST',
    body: payload,
    signal,
  });
}

export async function upsertDevice(userId: string, device: DeviceInfo, signal?: AbortSignal): Promise<void> {
  await requestLovable<void>({
    path: '/device-registry',
    method: 'POST',
    body: { ...device, user_id: userId },
    signal,
  });
}

export async function getDeviceRegistry(userId: string, signal?: AbortSignal): Promise<DeviceRegistryResponse> {
  const result = await requestLovable<DeviceRegistryResponse>({
    path: `/device-registry?user_id=${encodeURIComponent(userId)}`,
    method: 'GET',
    signal,
  });
  if (!result) {
    throw new Error('Device registry response was undefined');
  }
  return result;
}

