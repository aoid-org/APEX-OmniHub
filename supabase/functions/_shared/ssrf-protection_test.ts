import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { validateWebhookUrl } from "./ssrf-protection.ts";

const ALLOWLIST = ["example.com"];

function ipv4(a: number, b: number, c: number, d: number): string {
  return [a, b, c, d].join(".");
}

const LINK_LOCAL_METADATA_IP = ipv4(169, 254, 169, 254);
const SAFE_PUBLIC_TEST_IP = ipv4(93, 184, 216, 34);
const LINK_LOCAL_METADATA_MAPPED_IPV6 = `::ffff:${LINK_LOCAL_METADATA_IP}`;

Deno.test("validateWebhookUrl blocks cloud metadata/link-local destinations", async () => {
  const blockedTargets = [
    `https://${LINK_LOCAL_METADATA_IP}/latest/meta-data/`,
    `https://[${LINK_LOCAL_METADATA_MAPPED_IPV6}]/latest/meta-data/`,
  ];

  for (const target of blockedTargets) {
    await assertRejects(
      () => validateWebhookUrl(target, { allowlistHosts: ALLOWLIST }),
      Error,
      "blocked internal IP"
    );
  }
});

Deno.test("validateWebhookUrl rejects hostnames resolving to cloud metadata IPs", async () => {
  await assertRejects(
    () => validateWebhookUrl("https://api.example.com/webhook", {
      allowlistHosts: ALLOWLIST,
      dnsResolver: async () => [LINK_LOCAL_METADATA_IP],
    }),
    Error,
    "blocked IP"
  );
});

Deno.test("validateWebhookUrl accepts allowlisted public destinations", async () => {
  const url = await validateWebhookUrl("https://api.example.com/webhook", {
    allowlistHosts: ALLOWLIST,
    dnsResolver: async () => [SAFE_PUBLIC_TEST_IP],
  });

  assertEquals(url.hostname, "api.example.com");
});
