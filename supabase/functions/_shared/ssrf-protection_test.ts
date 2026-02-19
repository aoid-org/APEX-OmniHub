import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { validateWebhookUrl } from "./ssrf-protection.ts";

const ALLOWLIST = ["example.com"];

Deno.test("validateWebhookUrl blocks cloud metadata/link-local destinations", async () => {
  const blockedTargets = [
    "https://169.254.169.254/latest/meta-data/",
    "https://[::ffff:169.254.169.254]/latest/meta-data/",
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
      dnsResolver: async () => ["169.254.169.254"],
    }),
    Error,
    "blocked IP"
  );
});

Deno.test("validateWebhookUrl accepts allowlisted public destinations", async () => {
  const url = await validateWebhookUrl("https://api.example.com/webhook", {
    allowlistHosts: ALLOWLIST,
    dnsResolver: async () => ["93.184.216.34"],
  });

  assertEquals(url.hostname, "api.example.com");
});
