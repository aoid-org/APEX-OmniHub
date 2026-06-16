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
  return 'get' in source && typeof source.get === 'function';
}

function getHeader(source: HeaderSource, name: string): string | undefined {
  if (isHeadersLike(source)) {
    const val = source.get(name);
    return val ?? undefined;
  }
  return source[name];
}

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

interface ParsedToken {
  environment: 'production' | 'staging' | 'development';
  tenantId: string;
  secretPart: string;
  prefix: string;
}

function parseToken(authHeader: string | undefined): ParsedToken {
  if (!authHeader) throw new SpectreAuthError('Missing authorization header');
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') throw new SpectreAuthError('Invalid authorization format');
  
  const token = parts[1];
  const match = /^ak_(live|test)_([a-zA-Z0-9]+)_([a-zA-Z0-9]{32,})$/.exec(token);
  if (!match) throw new SpectreAuthError('Invalid API key format');
  
  return {
    environment: match[1] === 'live' ? 'production' : 'development',
    tenantId: match[2],
    secretPart: match[3],
    prefix: token.slice(0, 16)
  };
}

function validateRecord(record: AegisKeyRecord | null, parsed: ParsedToken): asserts record is AegisKeyRecord {
  if (!record) throw new SpectreAuthError('API key not found or revoked');
  if (record.tenantId !== parsed.tenantId) throw new SpectreAuthError('Tenant mismatch');
  if (record.environment !== parsed.environment) throw new SpectreAuthError('Environment mismatch');
  if (record.status !== 'active') throw new SpectreAuthError(`API key is ${record.status}`);
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) throw new SpectreAuthError('API key expired');
  
  const providedBuffer = Buffer.from(hashSecret(parsed.secretPart), 'hex');
  const storedBuffer = Buffer.from(record.keyHash, 'hex');
  
  if (providedBuffer.length !== storedBuffer.length || !timingSafeEqual(providedBuffer, storedBuffer)) {
    throw new SpectreAuthError('Invalid API key signature');
  }
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
  const parsed = parseToken(auth);
  const record = await _keyStore.lookupKey(parsed.prefix);
  
  validateRecord(record, parsed);

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
