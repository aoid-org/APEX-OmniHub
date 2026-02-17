import { assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { assertUrlSafe, SsrfOptions } from "./ssrf-protection.ts";

/**
 * SSRF Protection Test Suite
 *
 * SECURITY: HTTP URLs below are test fixtures verifying assertUrlSafe() REJECTS them.
 * These are NOT vulnerabilities - they are security validation tests.
 * SonarCloud hotspots for hardcoded IPs/HTTP are false positives.
 */

// Table-driven test structure to eliminate code duplication
interface TestCase {
  name: string;
  url: string;
  shouldBlock: boolean;
  options?: SsrfOptions;
  errorMsg?: string;
}

const TEST_CASES: TestCase[] = [
  // Blocked Local/Private
  {
    name: "blocks localhost",
    url: "http://localhost:8080", // NOSONAR
    shouldBlock: true,
    errorMsg: "SSRF protection blocked request",
  },
  {
    name: "blocks 127.0.0.1",
    url: "http://127.0.0.1", // NOSONAR
    shouldBlock: true,
    errorMsg: "SSRF protection blocked request",
  },
  {
    name: "blocks 0.0.0.0",
    url: "http://0.0.0.0", // NOSONAR
    shouldBlock: true,
    errorMsg: "SSRF protection blocked request",
  },
  {
    name: "blocks IPv6 localhost",
    url: "http://[::1]", // NOSONAR
    shouldBlock: true,
    errorMsg: "SSRF protection blocked request",
  },
  {
    name: "blocks private IP 192.168.x.x",
    url: "http://192.168.1.1", // NOSONAR
    shouldBlock: true,
    errorMsg: "SSRF protection blocked request",
  },
  {
    name: "blocks private IP 10.x.x.x",
    url: "http://10.0.0.1", // NOSONAR
    shouldBlock: true,
    errorMsg: "SSRF protection blocked request",
  },
  {
    name: "blocks private IP 172.16.x.x",
    url: "http://172.16.0.1", // NOSONAR
    shouldBlock: true,
    errorMsg: "SSRF protection blocked request",
  },
  {
    name: "blocks private IP 172.31.x.x",
    url: "http://172.31.255.255", // NOSONAR
    shouldBlock: true,
    errorMsg: "SSRF protection blocked request",
  },
  {
    name: "blocks AWS Metadata",
    url: "http://169.254.169.254", // NOSONAR
    shouldBlock: true,
    errorMsg: "SSRF protection blocked request",
  },

  // Blocked Domains (simulate DNS or suffix checks)
  {
    name: "blocks .local domain",
    url: "http://server.local", // NOSONAR
    shouldBlock: true,
    options: { resolveDns: false }, // Force suffix check without DNS
    errorMsg: "SSRF protection blocked request",
  },
  {
    name: "blocks .internal domain",
    url: "http://api.internal", // NOSONAR
    shouldBlock: true,
    options: { resolveDns: false },
    errorMsg: "SSRF protection blocked request",
  },
  {
    name: "blocks case insensitive LOCALHOST",
    url: "http://LOCALHOST", // NOSONAR
    shouldBlock: true,
    options: { resolveDns: false },
    errorMsg: "SSRF protection blocked request",
  },

  // Invalid Inputs
  {
    name: "rejects invalid URL string",
    url: "not-a-url",
    shouldBlock: true,
    errorMsg: "Invalid URL format",
  },
  {
    name: "rejects empty string",
    url: "",
    shouldBlock: true,
    errorMsg: "Invalid URL format",
  },

  // Allowed Public URLs
  {
    name: "allows public API domain",
    url: "https://api.example.com",
    shouldBlock: false,
  },
  {
    name: "allows public webhook",
    url: "https://webhook.site/test",
    shouldBlock: false,
  },
  {
    name: "allows public IP",
    url: "http://8.8.8.8", // NOSONAR
    shouldBlock: false,
  },
  {
    name: "allows URL with path and query",
    url: "https://api.example.com/webhook?token=abc123",
    shouldBlock: false,
  },
];

Deno.test("SSRF Protection - Table Driven Verification", async (t) => {
  for (const tc of TEST_CASES) {
    await t.step(tc.name, async () => {
      if (tc.shouldBlock) {
        // Expect rejection
        await assertRejects(
          async () => await assertUrlSafe(tc.url, tc.options),
          Error,
          tc.errorMsg,
        );
      } else {
        // Expect success (no throw)
        await assertUrlSafe(tc.url, tc.options);
      }
    });
  }
});
