/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// deno-lint-ignore-file no-import-prefix no-explicit-any
// @ts-ignore: Deno imports
import { assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { assertUrlSafe } from "./ssrf-protection.ts";

/**
 * SSRF Protection Test Suite
 *
 * SECURITY: HTTP URLs below are test fixtures verifying assertUrlSafe() REJECTS them.
 * These are NOT vulnerabilities - they are security validation tests.
 * SonarCloud hotspots for hardcoded IPs/HTTP are false positives.
 */

const DEFAULT_ERR = "SSRF protection blocked request";

const BLOCKED_IPS = [
  ["blocks localhost", "http://localhost:8080"], // NOSONAR
  ["blocks 127.0.0.1", "http://127.0.0.1"], // NOSONAR
  ["blocks 0.0.0.0", "http://0.0.0.0"], // NOSONAR
  ["blocks IPv6 localhost", "http://[::1]"], // NOSONAR
  ["blocks private IP 192.168.x.x", "http://192.168.1.1"], // NOSONAR
  ["blocks private IP 10.x.x.x", "http://10.0.0.1"], // NOSONAR
  ["blocks private IP 172.16.x.x", "http://172.16.0.1"], // NOSONAR
  ["blocks private IP 172.31.x.x", "http://172.31.255.255"], // NOSONAR
  ["blocks AWS Metadata", "http://169.254.169.254"], // NOSONAR
];

const BLOCKED_DOMAINS_NO_DNS = [
  ["blocks .local domain", "http://server.local"], // NOSONAR
  ["blocks .internal domain", "http://api.internal"], // NOSONAR
  ["blocks case insensitive LOCALHOST", "http://LOCALHOST"], // NOSONAR
];

const INVALID_URLS = [
  ["rejects invalid URL string", "not-a-url"],
  ["rejects empty string", ""],
];

const ALLOWED_PUBLIC_URLS = [
  ["allows public API domain", "https://api.example.com"], // NOSONAR
  ["allows public webhook", "https://webhook.site/test"], // NOSONAR
  ["allows public IP", "http://8.8.8.8"], // NOSONAR
  ["allows URL with path and query", "https://api.example.com/v1/data?q=1"], // NOSONAR
];

// @ts-ignore: Deno global
Deno.test("SSRF Protection - Table Driven Verification", async (t: any) => {
  for (const [name, url] of BLOCKED_IPS) {
    await t.step(name, async () => {
      await assertRejects(
        async () => await assertUrlSafe(url),
        Error,
        DEFAULT_ERR,
      );
    });
  }

  for (const [name, url] of BLOCKED_DOMAINS_NO_DNS) {
    await t.step(name, async () => {
      await assertRejects(
        async () => await assertUrlSafe(url, { resolveDns: false }),
        Error,
        DEFAULT_ERR,
      );
    });
  }

  for (const [name, url] of INVALID_URLS) {
    await t.step(name, async () => {
      await assertRejects(
        async () => await assertUrlSafe(url),
        Error,
        "Invalid URL format",
      );
    });
  }

  for (const [name, url] of ALLOWED_PUBLIC_URLS) {
    await t.step(name, async () => {
      await assertUrlSafe(url);
    });
  }
});
