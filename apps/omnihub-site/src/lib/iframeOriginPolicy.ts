/**
 * APEX-OmniHub iframe Origin Policy
 * @module apps/omnihub-site/src/lib/iframeOriginPolicy
 *
 * Provides URL sanitisation, origin allowlists, and iframe sandbox profiles
 * for OmniModal / OmniMedia / OmniSpatial / OmniAppShell rendering surfaces.
 *
 * Design principle: fail-closed.
 * - Unknown origins are BLOCKED by default, not allowed.
 * - Only HTTPS URLs are accepted in any context.
 * - Private/internal network targets are always blocked.
 * - javascript:, data:, blob:, ftp:, file:, about:, vbscript: are always blocked.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// ============================================================================
// Origin Allowlists
// ============================================================================

/**
 * First-party APEX origins.
 * Full capability set — use `first-party` sandbox profile.
 */
export const FIRST_PARTY_ORIGINS = new Set<string>([
  'https://omnihub.apexbusiness.ca',
  'https://app.apexbusiness.ca',
  'https://api.apexbusiness.ca',
  'https://staging.apexbusiness.ca',
]);

/**
 * Trusted partner origins.
 * Minimum required flags only — use `trusted-partner` sandbox profile.
 * No allow-same-origin; no allow-popups; no top-navigation.
 */
export const TRUSTED_PARTNER_ORIGINS = new Set<string>([
  'https://www.youtube.com',
  'https://player.vimeo.com',
  'https://open.spotify.com',
  'https://w.soundcloud.com',
  'https://embed.spotify.com',
  'https://bandcamp.com',
]);

/**
 * Demo-only origins.
 * Only permitted when `isDemoMode = true` is explicitly passed.
 * Never shown in production without the demo flag.
 */
export const DEMO_ONLY_ORIGINS = new Set<string>([
  'https://demo.apexbusiness.ca',
]);

/**
 * Protocols that are ALWAYS blocked regardless of origin or environment.
 */
const BLOCKED_PROTOCOLS = new Set<string>([
  'javascript:',
  'vbscript:',
  'data:',
  'blob:',
  'ftp:',
  'file:',
  'about:',
  'ws:',   // non-secure websocket
  'wss:',  // websocket — valid but not for iframe src
]);

// ============================================================================
// Sandbox Profiles
// ============================================================================

/** Sandbox profile tier names */
export type SandboxProfile = 'untrusted' | 'trusted-partner' | 'first-party';

/**
 * Sandbox attribute strings per profile.
 *
 * untrusted:
 *   - Only `allow-scripts`: zero same-origin, zero forms, zero popups,
 *     zero top-navigation. Safest possible sandbox.
 *
 * trusted-partner:
 *   - `allow-scripts allow-presentation`: supports media playback controls.
 *     Still no same-origin, no forms, no popups, no top-navigation.
 *
 * first-party:
 *   - Full set for APEX-owned content with strict CSP still applied at the host.
 *     No top-navigation escape allowed.
 */
export const SANDBOX_PROFILES: Record<SandboxProfile, string> = {
  'untrusted':
    'allow-scripts',
  'trusted-partner':
    'allow-scripts allow-presentation',
  'first-party':
    'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox',
};

// ============================================================================
// URL Sanitiser
// ============================================================================

export interface SanitiseResult {
  readonly allowed: boolean;
  readonly reason: string;
  readonly profile: SandboxProfile | null;
}

/** IPv4 private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x */
function isPrivateIpv4(host: string): boolean {
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

function isPrivateOrLoopback(host: string): boolean {
  if (host === 'localhost') return true;
  if (host === '127.0.0.1') return true;
  if (host === '::1' || host === '[::1]') return true;
  if (isPrivateIpv4(host)) return true;
  return false;
}

/**
 * Sanitise a URL for use as an iframe `src` attribute.
 *
 * Rules (evaluated in order, fail-closed on any mismatch):
 *  1. Reject empty / null / undefined URLs.
 *  2. Reject any blocked protocol prefix (fast-path, case-insensitive).
 *  3. Reject unparseable URLs.
 *  4. Reject non-HTTPS protocols.
 *  5. Reject private / internal network targets.
 *  6. Allow first-party APEX origins → `first-party` profile.
 *  7. Allow trusted partner origins → `trusted-partner` profile.
 *  8. Allow demo-only origins if `isDemoMode = true` → `trusted-partner` profile.
 *  9. Block demo-only origins in production mode.
 * 10. Block all other origins (fail-closed).
 *
 * @param raw - URL string from contextData.url or entryUrl config.
 * @param isDemoMode - When true, demo-only origins are permitted.
 * @returns SanitiseResult — { allowed, reason, profile }
 */
export function sanitiseIframeUrl(
  raw: string | undefined | null,
  isDemoMode = false,
): SanitiseResult {
  // 1. Empty / nullish
  if (!raw || raw.trim() === '') {
    return { allowed: false, reason: 'URL is empty or null', profile: null };
  }

  const trimmed = raw.trim().toLowerCase();

  // 2. Blocked protocol fast-path (before URL parsing to catch `javascript:alert()` etc.)
  for (const proto of BLOCKED_PROTOCOLS) {
    if (trimmed.startsWith(proto)) {
      return { allowed: false, reason: `Blocked protocol: "${proto}"`, profile: null };
    }
  }

  // 3. Parse URL
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { allowed: false, reason: 'Malformed URL: failed to parse', profile: null };
  }

  // 4. HTTPS-only in all contexts
  if (parsed.protocol !== 'https:') {
    return {
      allowed: false,
      reason: `Non-HTTPS protocol rejected: "${parsed.protocol}" — only https: is permitted`,
      profile: null,
    };
  }

  // 5. Private / internal network targets
  const host = parsed.hostname;
  if (isPrivateOrLoopback(host)) {
    return {
      allowed: false,
      reason: `Private/internal network target blocked: "${host}"`,
      profile: null,
    };
  }

  const origin = parsed.origin; // e.g. "https://www.youtube.com"

  // 6. First-party APEX origins
  if (FIRST_PARTY_ORIGINS.has(origin)) {
    return { allowed: true, reason: 'First-party APEX origin', profile: 'first-party' };
  }

  // 7. Trusted partner origins
  if (TRUSTED_PARTNER_ORIGINS.has(origin)) {
    return { allowed: true, reason: 'Trusted partner origin', profile: 'trusted-partner' };
  }

  // 8 / 9. Demo-only origins
  if (DEMO_ONLY_ORIGINS.has(origin)) {
    if (isDemoMode) {
      return {
        allowed: true,
        reason: 'Demo-only origin permitted (demo mode enabled)',
        profile: 'trusted-partner',
      };
    }
    return {
      allowed: false,
      reason: `Demo-only origin blocked in production mode: "${origin}"`,
      profile: null,
    };
  }

  // 10. Unknown origin — fail closed
  return {
    allowed: false,
    reason: `Unknown origin not in allowlist: "${origin}" — add to TRUSTED_PARTNER_ORIGINS or FIRST_PARTY_ORIGINS to permit`,
    profile: null,
  };
}

/**
 * Return the sandbox attribute string for a given profile.
 * Null / unknown profile returns the most restrictive `untrusted` sandbox.
 */
export function getSandboxAttribute(profile: SandboxProfile | null): string {
  return profile ? SANDBOX_PROFILES[profile] : SANDBOX_PROFILES['untrusted'];
}
