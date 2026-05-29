/**
 * Env-parameterized source registry resolution.
 *
 * The canonical sourceRegistry.ts reads process.env and caches. That works
 * on Node (tests) and Vercel Edge, but Cloudflare Pages Functions pass env
 * via context.env and don't populate process.env.
 *
 * This module provides env-aware versions used by the functions/ directory.
 * It intentionally does NOT cache across requests (each CF Pages Function
 * invocation may run on a different isolate / with different env snapshot).
 *
 * @module lib/omnibridge/registryEnv
 * @license Proprietary - APEX Business Systems Ltd.
 */

import type { M2MClientRecord, WebhookSourceResolution } from './sourceRegistry';

export interface RegistryEnv {
  OMNIBRIDGE_M2M_CLIENTS?: string;
  [key: string]: string | undefined;
}

const parseErrors = new WeakMap<RegistryEnv, Error | null>();

function validateWebhookShape(w: Record<string, unknown>): boolean {
  if (typeof w.source_id !== 'string') return false;
  if (typeof w.key_id !== 'string') return false;
  if (typeof w.secret_env !== 'string') return false;
  if (w.status !== 'active' && w.status !== 'inactive') return false;
  if (w.profile !== undefined && w.profile !== 'hardened' && w.profile !== 'sync_packet') return false;
  if (w.allowed_ips === undefined) return true;
  if (!Array.isArray(w.allowed_ips)) return false;
  for (const ip of w.allowed_ips) {
    if (typeof ip !== 'string') return false;
  }
  return true;
}

function validateRecord(record: unknown): record is M2MClientRecord {
  if (!record || typeof record !== 'object') return false;
  const r = record as Record<string, unknown>;
  if (typeof r.client_id !== 'string') return false;
  if (typeof r.client_secret_hash !== 'string') return false;
  if (!Array.isArray(r.scopes)) return false;
  for (const s of r.scopes) {
    if (typeof s !== 'string') return false;
  }
  if (typeof r.tenant_id !== 'string') return false;
  if (r.webhook === undefined) return true;
  const w = r.webhook as Record<string, unknown> | null;
  if (!w || typeof w !== 'object') return false;
  return validateWebhookShape(w);
}

function parseClients(env: RegistryEnv): M2MClientRecord[] | null {
  const raw = env.OMNIBRIDGE_M2M_CLIENTS;
  if (!raw) {
    parseErrors.set(env, new Error('OMNIBRIDGE_M2M_CLIENTS is not configured'));
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      parseErrors.set(env, new Error('OMNIBRIDGE_M2M_CLIENTS must be a JSON array'));
      return null;
    }
    const out: M2MClientRecord[] = [];
    for (const item of parsed) {
      if (!validateRecord(item)) {
        parseErrors.set(env, new Error('Malformed client record'));
        return null;
      }
      out.push(item);
    }
    parseErrors.set(env, null);
    return out;
  } catch (e) {
    parseErrors.set(env, new Error(`Failed to parse OMNIBRIDGE_M2M_CLIENTS: ${e instanceof Error ? e.message : String(e)}`));
    return null;
  }
}

export function lastRegistryErrorFromEnv(env: RegistryEnv): Error | null {
  return parseErrors.get(env) ?? null;
}

export function resolveSyncPacketSourceFromEnv(
  sourceId: string,
  env: RegistryEnv,
): WebhookSourceResolution | null {
  const clients = parseClients(env);
  if (!clients) return null;
  for (const client of clients) {
    if (!client.webhook) continue;
    if (client.webhook.source_id !== sourceId) continue;
    if (client.webhook.profile !== 'sync_packet') continue;
    if (client.webhook.status !== 'active') return null;
    const secret = env[client.webhook.secret_env];
    if (!secret) {
      console.error(`[omnibridge/registryEnv] Secret env ${client.webhook.secret_env} not set for ${sourceId}`);
      return null;
    }
    return { client, webhook: client.webhook, secret };
  }
  return null;
}

export function resolveHardenedSourceFromEnv(
  sourceId: string,
  keyId: string,
  env: RegistryEnv,
): WebhookSourceResolution | null {
  const clients = parseClients(env);
  if (!clients) return null;
  for (const client of clients) {
    if (!client.webhook) continue;
    if (client.webhook.source_id !== sourceId) continue;
    if (client.webhook.key_id !== keyId) continue;
    // Default profile is 'hardened' when unspecified (back-compat).
    if (client.webhook.profile && client.webhook.profile !== 'hardened') continue;
    if (client.webhook.status !== 'active') return null;
    const secret = env[client.webhook.secret_env];
    if (!secret) {
      console.error(`[omnibridge/registryEnv] Secret env ${client.webhook.secret_env} not set for ${sourceId}`);
      return null;
    }
    return { client, webhook: client.webhook, secret };
  }
  return null;
}
