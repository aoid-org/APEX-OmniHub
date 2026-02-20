// deno-lint-ignore-file no-import-prefix no-explicit-any
// @ts-ignore: Deno imports
import { assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { assertUrlSafe, SsrfOptions } from "./ssrf-protection.ts";

/**
 * SSRF Protection Test Suite
 *
 * SECURITY: HTTP URLs below are test fixtures verifying assertUrlSafe() REJECTS them.
 * These are NOT vulnerabilities - they are security validation tests.
 * SonarCloud hotspots for hardcoded IPs/HTTP are false positives.
 */

// Tuple format: [name, url, shouldBlock, options?, errorMsg?]
// This minimizes structural duplication (repeated property names).
type TestTuple = [
  string, // Name
  string, // URL
  boolean, // Should Block?
  SsrfOptions?, // Options
  string?, // Error Message
];

const TEST_CASES: TestTuple[] = [
  // Blocked Local/Private
  [
    "blocks localhost",
    "http://localhost:8080", // NOSONAR
    true,
    undefined,
    "SSRF protection blocked request",
  ],
  [
    "blocks 127.0.0.1",
    "http://127.0.0.1", // NOSONAR
    true,
    undefined,
    "SSRF protection blocked request",
  ],
  [
    "blocks 0.0.0.0",
    "http://0.0.0.0", // NOSONAR
    true,
    undefined,
    "SSRF protection blocked request",
  ],
  [
    "blocks IPv6 localhost",
    "http://[::1]", // NOSONAR
    true,
    undefined,
    "SSRF protection blocked request",
  ],
  [
    "blocks private IP 192.168.x.x",
    "http://192.168.1.1", // NOSONAR
    true,
    undefined,
    "SSRF protection blocked request",
  ],
  [
    "blocks private IP 10.x.x.x",
    "http://10.0.0.1", // NOSONAR
    true,
    undefined,
    "SSRF protection blocked request",
  ],
  [
    "blocks private IP 172.16.x.x",
    "http://172.16.0.1", // NOSONAR
    true,
    undefined,
    "SSRF protection blocked request",
  ],
  [
    "blocks private IP 172.31.x.x",
    "http://172.31.255.255", // NOSONAR
    true,
    undefined,
    "SSRF protection blocked request",
  ],
  [
    "blocks AWS Metadata",
    "http://169.254.169.254", // NOSONAR
    true,
    undefined,
    "SSRF protection blocked request",
  ],

  // Blocked Domains (simulate DNS or suffix checks)
  [
    "blocks .local domain",
    "http://server.local", // NOSONAR
    true,
    { resolveDns: false },
    "SSRF protection blocked request",
  ],
  [
    "blocks .internal domain",
    "http://api.internal", // NOSONAR
    true,
    { resolveDns: false },
    "SSRF protection blocked request",
  ],
  [
    "blocks case insensitive LOCALHOST",
    "http://LOCALHOST", // NOSONAR
    true,
    { resolveDns: false },
    "SSRF protection blocked request",
  ],

  // Invalid Inputs
  [
    "rejects invalid URL string",
    "not-a-url",
    true,
    undefined,
    "Invalid URL format",
  ],
  [
    "rejects empty string",
    "",
    true,
    undefined,
    "Invalid URL format",
  ],

  // Allowed Public URLs
  [
    "allows public API domain",
    "https://api.example.com", // NOSONAR
    false,
    undefined,
    undefined,
  ],
  [
    "allows public webhook",
    "https://webhook.site/test", // NOSONAR
    false,
    undefined,
    undefined,
  ],
  [
    "allows public IP",
    "http://8.8.8.8", // NOSONAR
    false,
    undefined,
    undefined,
  ],
  [
    "allows URL with path and query",
    "https://api.example.com/webhook?token=abc123", // NOSONAR
    false,
    undefined,
    undefined,
  ],
];

// @ts-ignore: Deno global
Deno.test("SSRF Protection - Table Driven Verification", async (t: any) => {
  for (const [name, url, shouldBlock, options, errorMsg] of TEST_CASES) {
    await t.step(name, async () => {
      if (shouldBlock) {
        // Expect rejection
        await assertRejects(
          async () => await assertUrlSafe(url, options),
          Error,
          errorMsg,
        );
      } else {
        // Expect success (no throw)
        await assertUrlSafe(url, options);
      }
    });
  }
});
