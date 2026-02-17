
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { PiiScanner } from "./pii-scanner.ts";

Deno.test("PII Scanner - Detects & Redacts Email", () => {
  const input = "Contact me at test@example.com immediately.";
  const result = PiiScanner.scan(input);
  
  assertEquals(result.hasPii, true);
  assertEquals(result.redactedText.includes("test@example.com"), false);
  assertEquals(result.redactedText.includes("[REDACTED_EMAIL]"), true);
});

Deno.test("PII Scanner - Detects & Redacts Phone", () => {
  const input = "Call 555-0199 for support.";
  const result = PiiScanner.scan(input);

  assertEquals(result.hasPii, true);
  assertEquals(result.redactedText.includes("555-0199"), false);
  assertEquals(result.redactedText.includes("[REDACTED_PHONE]"), true);
});

Deno.test("PII Scanner - Clean Text Passes", () => {
  const input = "Hello world, this is safe text.";
  const result = PiiScanner.scan(input);

  assertEquals(result.hasPii, false);
  assertEquals(result.redactedText, input);
});
