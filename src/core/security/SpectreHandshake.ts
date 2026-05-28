/**
 * SpectreHandshake — Device authentication and classification.
 *
 * Implements Zero-Trust API Key validation:
 * - High-entropy key format (ak_live_[tenant]_[random])
 * - Stored hash validation with timing-safe comparison
 * - Strict expiry and revocation checks
 *
 * @module core/security/SpectreHandshake
 * @version 2.0.0
 * @date 2026-05-27
 */

import { timingSafeEqual, createHash } from 'node:crypto';
import type { DeviceProfile } from '../types/index';
import { TrustTier } from '../types/index';
import { AEGIS_MATRIX } from './AegisMatrix';

export class SpectreAuthError extends Error {
  constructor(message: string, public readonly statusCode: number = 403) {
    super(message);
    this.name = 'SpectreAuthError';
  }
}

export interface AegisKeyRecord {
  keyId: string;
  tenantId: string;
  keyHash: string; // sha256 of the random portion
  trustTier: TrustTier;
  status: 'active' | 'revoked' | 'expired';
  expiresAt?: string;
  environment: 'production' | 'staging' | 'development';
  audience: string[];
}

/**
 * Interface for database lookup of API keys.
 */
export interface AegisKeyStore {
  lookupKey(prefix: string): Promise<AegisKeyRecord | null>;
  updateLastUsed(keyId: string): Promise<void>;
}

// In-memory store for testing (will be replaced by Supabase adapter in production)
let _keyStore: AegisKeyStore | null = null;

export function setKeyStore(store: AegisKeyStore): void {
  _keyStore = store;
}

type HeaderSource =
  | { get(name: string): string | null | undefined }
  | Record<string, string | undefined>;

/** Type guard: narrows HeaderSource to the Headers-like variant that has .get() */
interface HeadersLike {
  get(name: string): string | null | undefined;
}

function isHeadersLike(source: HeaderSource): source is HeadersLike {
  return typeof (source as HeadersLike).get === 'function';
}

function getHeader(source: HeaderSource, name: string): string | undefined {
  if (isHeadersLike(source)) {
    const val = source.get(name);
    return val ?? undefined;
  }
  return (source as Record<string, string | undefined>)[name];
}

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

/**
 * Authenticate and classify an inbound device connection using zero-trust principles.
 *
 * @param headers - request or upgrade headers
 * @param connectionId - unique connection identifier
 * @returns DeviceProfile on success
 * @throws SpectreAuthError on missing/invalid credentials
 */
export async function authenticate(
  headers: HeaderSource,
  connectionId: string,
): Promise<DeviceProfile> {
  if (!_keyStore) {
    throw new Error('AegisKeyStore not initialized');
  }

  const auth = getHeader(headers, 'authorization');
  if (!auth) {
    throw new SpectreAuthError('Missing authorization header');
  }

  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new SpectreAuthError('Invalid authorization format');
  }

  const token = parts[1];
  
  // Format: ak_live_[tenantId]_[random32]
  const match = token.match(/^ak_(live|test)_([a-zA-Z0-9]+)_([a-zA-Z0-9]{32,})$/);
  if (!match) {
    throw new SpectreAuthError('Invalid API key format');
  }

  const environment = match[1] === 'live' ? 'production' : 'test';
  const tenantId = match[2];
  const secretPart = match[3];

  const prefix = token.slice(0, 16); // e.g. ak_live_tenant_xxxx
  const record = await _keyStore.lookupKey(prefix);

  if (!record) {
    throw new SpectreAuthError('API key not found or revoked');
  }

  if (record.tenantId !== tenantId) {
    throw new SpectreAuthError('Tenant mismatch');
  }

  if (record.environment !== environment) {
    throw new SpectreAuthError('Environment mismatch');
  }

  if (record.status !== 'active') {
    throw new SpectreAuthError(`API key is ${record.status}`);
  }

  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    throw new SpectreAuthError('API key expired');
  }

  // Timing-safe comparison of the hash
  const providedHash = hashSecret(secretPart);
  const providedBuffer = Buffer.from(providedHash, 'hex');
  const storedBuffer = Buffer.from(record.keyHash, 'hex');

  if (providedBuffer.length !== storedBuffer.length) {
    throw new SpectreAuthError('Invalid API key signature');
  }

  if (!timingSafeEqual(providedBuffer, storedBuffer)) {
    throw new SpectreAuthError('Invalid API key signature');
  }

  // GOD_MODE must be restricted and break-glass only.
  // We check for a special header to activate GOD_MODE, otherwise it acts as OPERATOR.
  let effectiveTier = record.trustTier;
  if (record.trustTier === TrustTier.GOD_MODE) {
    const breakGlass = getHeader(headers, 'x-apex-break-glass');
    if (breakGlass !== 'true') {
      // Degrade to operator unless explicit break-glass is requested
      effectiveTier = TrustTier.OPERATOR;
    }
  }

  // Asynchronously update last used
  _keyStore.updateLastUsed(record.keyId).catch((err) => {
    console.error('Failed to update key last_used metadata', err);
  });

  return {
    deviceId: record.keyId,
    trustTier: effectiveTier,
    capabilities: AEGIS_MATRIX[effectiveTier] ?? ['read_only'],
    connectionId,
    authenticatedAt: new Date().toISOString(),
  };
}
