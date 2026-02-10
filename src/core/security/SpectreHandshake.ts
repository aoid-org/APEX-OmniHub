/**
 * SpectreHandshake — Device authentication and classification.
 *
 * Extracts credentials from inbound connection headers,
 * validates the bearer token prefix, and maps the device
 * identifier to a TrustTier + capabilities via Aegis models.
 *
 * @module core/security/SpectreHandshake
 * @version 1.0.0
 * @date 2026-02-09
 */

import {
  type DeviceCapability,
  type DeviceProfile,
  TrustTier,
} from '../types/index';

/* ------------------------------------------------------------------ */
/*  Device → Trust mapping (static, deterministic)                     */
/* ------------------------------------------------------------------ */

interface DeviceClassification {
  readonly trustTier: TrustTier;
  readonly capabilities: ReadonlyArray<DeviceCapability>;
}

const DEVICE_CLASSIFICATIONS: Record<string, DeviceClassification> = {
  gumdrop: {
    trustTier: TrustTier.PERIPHERAL,
    capabilities: ['audio_in', 'audio_out', 'log_insight'],
  },
  'operator-desktop': {
    trustTier: TrustTier.OPERATOR,
    capabilities: [
      'file_system',
      'deploy_service',
      'create_invoice',
    ],
  },
  'apex-admin': {
    trustTier: TrustTier.GOD_MODE,
    capabilities: ['all'],
  },
};

const DEFAULT_CLASSIFICATION: DeviceClassification = {
  trustTier: TrustTier.PUBLIC,
  capabilities: ['read_only'],
};

const AUTH_PREFIX = 'Bearer apex_sk_';

/* ------------------------------------------------------------------ */
/*  Errors                                                             */
/* ------------------------------------------------------------------ */

export class SpectreAuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 403,
  ) {
    super(message);
    this.name = 'SpectreAuthError';
  }
}

/* ------------------------------------------------------------------ */
/*  Header extraction helpers                                          */
/* ------------------------------------------------------------------ */

type HeaderSource =
  | { get(name: string): string | null | undefined }
  | Record<string, string | undefined>;

function getHeader(
  source: HeaderSource,
  name: string,
): string | undefined {
  if (typeof (source as { get?: unknown }).get === 'function') {
    const val = (source as { get(n: string): string | null }).get(
      name,
    );
    return val ?? undefined;
  }
  return (source as Record<string, string | undefined>)[name];
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Authenticate and classify an inbound device connection.
 *
 * @param headers     - request or upgrade headers
 * @param connectionId - unique connection identifier (pre-generated)
 * @returns DeviceProfile on success
 * @throws SpectreAuthError on missing/invalid credentials
 */
export function authenticate(
  headers: HeaderSource,
  connectionId: string,
): DeviceProfile {
  const auth = getHeader(headers, 'authorization');
  if (!auth) {
    throw new SpectreAuthError('Missing authorization header');
  }

  if (!auth.startsWith(AUTH_PREFIX)) {
    throw new SpectreAuthError(
      'Invalid authorization format',
    );
  }

  const deviceId =
    getHeader(headers, 'x-apex-device-id') ?? 'unknown';

  const classification =
    DEVICE_CLASSIFICATIONS[deviceId] ?? DEFAULT_CLASSIFICATION;

  return {
    deviceId,
    trustTier: classification.trustTier,
    capabilities: classification.capabilities,
    connectionId,
    authenticatedAt: new Date().toISOString(),
  };
}
