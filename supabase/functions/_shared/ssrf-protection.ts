/**
 * SSRF protection for outbound webhook requests.
 *
 * Defense-in-depth:
 * - Strict scheme and credential validation
 * - Mandatory host allowlist (env-driven or explicit)
 * - IPv4/IPv6 literal validation with private/reserved range blocking
 * - DNS resolution + rebinding defense (all resolved IPs must be public)
 * - Redirects must be handled manually and re-validated
 */

export interface SsrfValidationOptions {
  allowlistHosts?: string[];
  dnsResolver?: (hostname: string) => Promise<string[]>;
}

const BLOCKED_V4_CIDRS = [
  "0.0.0.0/8",      // this network
  "10.0.0.0/8",     // RFC1918 private (intentional SSRF denylist) // NOSONAR
  "100.64.0.0/10",  // CGNAT
  "127.0.0.0/8",    // loopback
  "169.254.0.0/16", // link-local
  "172.16.0.0/12",  // RFC1918 private (intentional SSRF denylist) // NOSONAR
  "192.0.0.0/24",   // IETF protocol assignments (intentional SSRF denylist) // NOSONAR
  "192.168.0.0/16", // RFC1918 private (intentional SSRF denylist) // NOSONAR
  "198.18.0.0/15",  // benchmarking (intentional SSRF denylist) // NOSONAR
  "224.0.0.0/4",    // multicast (intentional SSRF denylist) // NOSONAR
  "240.0.0.0/4",    // reserved (intentional SSRF denylist) // NOSONAR
] as const;

const BLOCKED_V6_PREFIXES = [
  "::/128",          // unspecified
  "::1/128",         // loopback
  "fc00::/7",        // unique local
  "fe80::/10",       // link-local
  "ff00::/8",        // multicast
  "2001:db8::/32",   // documentation
  "2001:10::/28",    // ORCHID (intentional SSRF denylist) // NOSONAR
] as const;

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function isIpv4(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

function isIpv6(hostname: string): boolean {
  return hostname.includes(":");
}

function normalizeIpv6(ip: string): string {
  // Strip zone index if present (e.g., fe80::1%eth0)
  return ip.split("%")[0].replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
}

function expandIpv6(ip: string): string[] {
  const normalized = normalizeIpv6(ip);
  if (!normalized.includes("::")) {
    const sections = normalized.split(":");
    return sections.map((section) => section.padStart(4, "0"));
  }

  const [left, right] = normalized.split("::");
  const leftParts = left ? left.split(":") : [];
  const rightParts = right ? right.split(":") : [];
  const missing = 8 - (leftParts.length + rightParts.length);
  const middle = new Array(Math.max(0, missing)).fill("0000");
  return [
    ...leftParts.map((s) => s.padStart(4, "0")),
    ...middle,
    ...rightParts.map((s) => s.padStart(4, "0")),
  ];
}

function ipv6ToBigInt(ip: string): bigint {
  const expanded = expandIpv6(ip);
  if (expanded.length !== 8) {
    throw new Error(`Invalid IPv6 address: ${ip}`);
  }

  return expanded.reduce((acc, section) => {
    const value = BigInt(`0x${section}`);
    return (acc << 16n) + value;
  }, 0n);
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);

  if (isIpv4(ip) && isIpv4(range)) {
    const mask = bits === 0 ? 0 : (~((2 ** (32 - bits)) - 1) >>> 0);
    return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range) & mask);
  }

  if (isIpv6(ip) && isIpv6(range)) {
    const ipNum = ipv6ToBigInt(ip);
    const rangeNum = ipv6ToBigInt(range);
    const shift = 128n - BigInt(bits);
    return (ipNum >> shift) === (rangeNum >> shift);
  }

  return false;
}

function isBlockedIp(ip: string): boolean {
  const lower = normalizeIpv6(ip);

  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice("::ffff:".length);
    if (isIpv4(mapped)) {
      return isBlockedIp(mapped);
    }
  }

  if (isIpv4(lower)) {
    return BLOCKED_V4_CIDRS.some((cidr) => isIpInCidr(lower, cidr));
  }

  if (isIpv6(lower)) {
    return BLOCKED_V6_PREFIXES.some((cidr) => isIpInCidr(lower, cidr));
  }

  return true;
}

async function defaultDnsResolver(hostname: string): Promise<string[]> {
  const records = new Set<string>();

  const addRecords = async (type: "A" | "AAAA") => {
    try {
      const resolved = await Deno.resolveDns(hostname, type);
      for (const ip of resolved) records.add(ip);
    } catch {
      // no-op: allow missing family; final empty set is handled by caller
    }
  };

  await Promise.all([addRecords("A"), addRecords("AAAA")]);
  return [...records];
}

function parseHostAllowlist(): string[] {
  const raw = Deno.env.get("WEBHOOK_HOST_ALLOWLIST") ?? "";
  return raw
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

function isHostAllowed(hostname: string, allowlist: readonly string[]): boolean {
  const host = normalizeHost(hostname);
  return allowlist.some((entry) => {
    const normalizedEntry = normalizeHost(entry);
    return host === normalizedEntry || host.endsWith(`.${normalizedEntry}`);
  });
}

function assertDirectHostSafety(url: URL, allowlistHosts: readonly string[]): void {
  if (url.protocol !== "https:") {
    throw new Error("Webhook URL must use https");
  }

  if (url.username || url.password) {
    throw new Error("Webhook URL must not include credentials");
  }

  if (allowlistHosts.length === 0) {
    throw new Error("Webhook host allowlist is not configured");
  }

  if (!isHostAllowed(url.hostname, allowlistHosts)) {
    throw new Error("Webhook hostname is not in the allowlist");
  }
}

export async function validateWebhookUrl(
  rawUrl: string,
  options: SsrfValidationOptions = {}
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid webhook URL format");
  }

  const allowlist = options.allowlistHosts ?? parseHostAllowlist();
  assertDirectHostSafety(url, allowlist);

  if (isIpv4(url.hostname) || isIpv6(url.hostname)) {
    if (isBlockedIp(url.hostname)) {
      throw new Error("Webhook URL resolves to a blocked internal IP");
    }
    return url;
  }

  const dnsResolver = options.dnsResolver ?? defaultDnsResolver;
  const resolvedIps = await dnsResolver(url.hostname);

  if (!resolvedIps.length) {
    throw new Error("Webhook hostname could not be resolved");
  }

  for (const ip of resolvedIps) {
    if (isBlockedIp(ip)) {
      throw new Error(`Webhook hostname resolves to blocked IP: ${ip}`);
    }
  }

  return url;
}

export async function validateRedirectTarget(
  location: string,
  baseUrl: URL,
  options: SsrfValidationOptions = {}
): Promise<URL> {
  const redirectUrl = new URL(location, baseUrl);
  return validateWebhookUrl(redirectUrl.toString(), options);
}
