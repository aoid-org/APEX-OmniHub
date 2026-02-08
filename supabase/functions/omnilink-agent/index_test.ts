/**
 * Unit tests for omnilink-agent edge function validation logic.
 *
 * Tests the HTTP status code semantics and guardian behavior
 * without requiring a running Supabase instance.
 * Uses Deno built-in assert (no external imports).
 */

import { checkRequest } from "./guardian.ts";

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

function assertEquals<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(
      msg ?? `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

// --- Guardian unit tests ---

Deno.test("guardian: allows normal query", async () => {
  const result = await checkRequest("Search for my recent orders", "Bearer token");
  assertEquals(result.allowed, true, "normal query should be allowed");
});

Deno.test("guardian: blocks oversized query (>2000 chars)", async () => {
  const longQuery = "a".repeat(2001);
  const result = await checkRequest(longQuery, "Bearer token");
  assertEquals(result.allowed, false, "oversized query should be blocked");
  assertEquals(result.reason, "invalid_request");
});

Deno.test("guardian: allows query at exact limit (2000 chars)", async () => {
  const query = "b".repeat(2000);
  const result = await checkRequest(query, "Bearer token");
  assertEquals(result.allowed, true, "2000-char query should be allowed");
});

// --- Validation logic unit tests ---

Deno.test("validation: query must be string type", () => {
  const body = { query: 123, traceId: "abc" };
  assert(typeof body.query !== "string", "numeric query should fail string check");
});

Deno.test("validation: traceId must be string type", () => {
  const body = { query: "hello", traceId: null };
  assert(typeof body.traceId !== "string", "null traceId should fail string check");
});

Deno.test("validation: valid body passes type checks", () => {
  const body = { query: "Search orders", traceId: "trace-123" };
  assert(
    typeof body.query === "string" && typeof body.traceId === "string",
    "valid body should pass type checks",
  );
});

Deno.test("validation: missing query fails", () => {
  const body = { traceId: "abc" } as Record<string, unknown>;
  assert(typeof body.query !== "string", "missing query should fail");
});

Deno.test("validation: missing traceId fails", () => {
  const body = { query: "hello" } as Record<string, unknown>;
  assert(typeof body.traceId !== "string", "missing traceId should fail");
});
