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
    if (typeof globalThis.window !== 'undefined' && import.meta.env.DEV) {
      console.warn(
        '⚠️ Lovable API not configured. Missing:',
        baseUrl ? '' : 'LOVABLE_API_BASE',
        apiKey ? '' : 'LOVABLE_API_KEY'
      );
    }
    return null;
  }

  return { baseUrl, apiKey, serviceRoleKey };
}

function buildHeaders(apiKey: string, serviceRoleKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (serviceRoleKey) {
    headers['X-Service-Role'] = serviceRoleKey;
  }
  return headers;
}

function parseResponseBody<T>(response: Response): Promise<T | undefined> {
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return Promise.resolve(undefined as T);
}

async function handleErrorResponse(response: Response): Promise<Error> {
  const text = await response.text().catch(() => '');
  return new Error(`Lovable request failed (${response.status}): ${text}`);
}

function isConfigMissing(): boolean {
  return !getConfig();
}

function waitForBackoff(attempt: number, baseDelayMs: number, maxDelayMs: number): Promise<void> {
  const delay = calculateBackoffDelay(attempt, { baseMs: baseDelayMs, maxMs: maxDelayMs });
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function attemptFetch(
  url: string,
  apiKey: string,
  serviceRoleKey: string | undefined,
  body: unknown,
  method: string,
  signal?: AbortSignal
): Promise<{ response?: Response; error?: unknown }> {
  try {
    const response = await fetch(url, {
      method,
      headers: buildHeaders(apiKey, serviceRoleKey),
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    return { response };
  } catch (error) {
    return { error };
  }
}

function shouldRetryError(status: number, attempt: number, maxAttempts: number): boolean {
  return status >= 500 && attempt < maxAttempts;
}

async function requestLovable<T>(options: LovableRequestOptions): Promise<T | undefined> {
  if (isConfigMissing()) {
    if (typeof globalThis.window !== 'undefined' && import.meta.env.DEV) {
      console.warn('⚠️ Lovable request skipped: API not configured');
    }
    return undefined;
  }
  const { baseUrl, apiKey, serviceRoleKey } = getConfig()!;
  const {
    path,
    body,
    method = 'POST',
    signal,
    maxAttempts = 5,
    baseDelayMs = 500,
    maxDelayMs = 10_000,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { response, error } = await attemptFetch(`${baseUrl}${path}`, apiKey, serviceRoleKey, body, method, signal);

    if (error) {
      lastError = error;
      if (attempt < maxAttempts) await waitForBackoff(attempt, baseDelayMs, maxDelayMs);
      continue;
    }

    if (!response!.ok) {
      lastError = await handleErrorResponse(response!);
      if (shouldRetryError(response!.status, attempt, maxAttempts)) {
        await waitForBackoff(attempt, baseDelayMs, maxDelayMs);
        continue;
      }
      throw lastError;
    }

    return await parseResponseBody<T>(response!);
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

