/**
 * Node-compatible SSRF validation module.
 *
 * This is the Node/Vitest-side implementation of SSRF protection.
 * The Deno edge function equivalent lives at supabase/functions/_shared/ssrf-protection.ts
 * but cannot be imported from Node due to Deno-specific URL imports (https://esm.sh/*).
 *
 * Author: APEX Security Team
 * Date: 2026-02-20
 */

import { isIP } from 'node:net';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebhookValidationOptions {
  allowlistHosts: string[];
  dnsResolver?: (hostname: string) => Promise<string[]>;
}

export interface WebhookValidationResult {
  hostname: string;
  resolvedIps: string[];
}

// ---------------------------------------------------------------------------
// Private IP ranges (RFC 1918, RFC 4193, RFC 3927, Cloud Metadata)
// ---------------------------------------------------------------------------

const BLOCKED_IPV4_PREFIXES = [
  '10.',
  '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.',
  '172.24.', '172.25.', '172.26.', '172.27.',
  '172.28.', '172.29.', '172.30.', '172.31.',
  '192.168.',
  '127.',
  '0.',
  '169.254.',
];

const BLOCKED_IPV6 = ['::1', 'fe80:', 'fc00:', 'fd00:'];

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    return BLOCKED_IPV4_PREFIXES.some((prefix) => ip.startsWith(prefix));
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true;
    return BLOCKED_IPV6.some((prefix) => lower.startsWith(prefix));
  }
  return false;
}

/**
 * Asserts that the hostname (which may be an IPv6 literal or a raw IP)
 * is not a private/internal address. Extracted to reduce CC of the main
 * validator below the SonarCloud-permitted threshold of 15.
 */
function assertHostnameNotPrivate(hostname: string): void {
  // IPv6 literal (e.g. "[::1]")
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    const addr = hostname.slice(1, -1);
    if (isPrivateIp(addr)) {
      throw new Error('SSRF blocked internal IP');
    }
    return;
  }

  // Direct IPv4/IPv6 address
  if (isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error('SSRF blocked IP');
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a webhook URL against SSRF attack vectors:
 * - Protocol must be https
 * - Host must be on the allowlist
 * - Resolved IPs must not be private/internal
 *
 * @param url - The webhook URL to validate
 * @param options - Validation options including allowlist and optional DNS resolver
 */
export async function validateWebhookUrl(
  url: string,
  options: WebhookValidationOptions,
): Promise<WebhookValidationResult> {
  const { allowlistHosts, dnsResolver } = options;

  // Validate allowlist is configured
  if (!allowlistHosts || allowlistHosts.length === 0) {
    throw new Error('Allowlist is not configured');
  }

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  // Protocol check
  if (parsed.protocol !== 'https:') {
    throw new Error('URL must use HTTPS protocol');
  }

  const hostname = parsed.hostname;

  // Block private/internal IPs (IPv4, IPv6, IPv6-literal)
  assertHostnameNotPrivate(hostname);

  // Allowlist check: hostname or parent domain must be in allowlist
  const isAllowed = allowlistHosts.some((allowed) => {
    return hostname === allowed || hostname.endsWith(`.${allowed}`);
  });

  if (!isAllowed) {
    throw new Error(`Host '${hostname}' is not on the allowlist`);
  }

  // DNS resolution check
  let resolvedIps: string[] = [];
  if (dnsResolver) {
    resolvedIps = await dnsResolver(hostname);
    for (const ip of resolvedIps) {
      if (isPrivateIp(ip)) {
        throw new Error(`DNS resolved to blocked IP: ${ip}`);
      }
    }
  }

  return { hostname, resolvedIps };
}

/**
 * Validates a redirect target URL against SSRF vectors.
 * Resolves relative redirects against the base URL.
 *
 * @param target - The redirect target (can be relative)
 * @param baseUrl - The original request URL
 * @param options - Validation options
 */
export async function validateRedirectTarget(
  target: string,
  baseUrl: URL,
  options: WebhookValidationOptions,
): Promise<URL> {
  const resolved = new URL(target, baseUrl);
  await validateWebhookUrl(resolved.toString(), options);
  return resolved;
}
