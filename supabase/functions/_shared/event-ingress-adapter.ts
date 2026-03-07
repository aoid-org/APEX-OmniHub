/**
 * Event Ingress Adapter (Edge Plane)
 *
 * Normalizes ANY incoming webhook or API payload into the canonical
 * EventEnvelope schema for the Temporal trigger-workflow edge function.
 *
 * Strict separation of concerns: this file handles event normalization ONLY.
 * LLM provider adaptation lives in universal-adapter.ts.
 *
 * Fail-closed: throws on any validation failure — never returns partial data.
 * Pure function: deterministic output for identical inputs (aside from generated IDs).
 */

import { z } from 'https://esm.sh/zod@3.25.76';

// ─── Zod Schemas ─────────────────────────────────────────────────────

export const EventMetadataSchema = z.object({
  rawPayload: z.record(z.unknown()),
  receivedAt: z.string(),
  sourceIp: z.string().optional(),
  userAgent: z.string().optional(),
  ingestChannel: z.enum(["webhook", "api", "internal"]),
});

export const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  intentId: z.string().min(1),
  traceId: z.string().uuid(),
  tenantId: z.string().min(1),
  idempotencyKey: z.string().min(10),
  timestamp: z.string(),
  schemaVersion: z.string().default("1.0.0"),
  metadata: EventMetadataSchema,
});

// ─── Inferred Types ──────────────────────────────────────────────────

export type EventMetadata = z.infer<typeof EventMetadataSchema>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

// ─── Intent Extraction ──────────────────────────────────────────────

const INTENT_KEYS = ["intentId", "intent_id", "intent", "action", "event_type", "type"] as const;

function extractIntentId(payload: Record<string, unknown>): string {
  for (const key of INTENT_KEYS) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  // Nested extraction: check common wrapper patterns
  const nested = payload["data"] ?? payload["body"] ?? payload["event"];
  if (nested && typeof nested === "object" && nested !== null) {
    for (const key of INTENT_KEYS) {
      const value = (nested as Record<string, unknown>)[key];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
  }

  throw new Error(
    "FAIL_CLOSED: No intentId could be extracted from payload. " +
    `Searched keys: [${INTENT_KEYS.join(", ")}] at root and nested levels.`
  );
}

// ─── Tenant Extraction ──────────────────────────────────────────────

const TENANT_KEYS = ["tenantId", "tenant_id", "org_id", "orgId", "workspace_id"] as const;

function extractTenantId(payload: Record<string, unknown>): string {
  for (const key of TENANT_KEYS) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  throw new Error(
    "FAIL_CLOSED: No tenantId could be extracted from payload. " +
    `Searched keys: [${TENANT_KEYS.join(", ")}].`
  );
}

// ─── Normalizer ─────────────────────────────────────────────────────

export interface NormalizeOptions {
  readonly sourceIp?: string;
  readonly userAgent?: string;
  readonly channel?: "webhook" | "api" | "internal";
}

/**
 * Normalizes any incoming webhook or API payload into a validated EventEnvelope.
 *
 * Pure function: deterministic output for identical inputs (aside from generated IDs).
 * Fail-closed: throws on any validation failure — never returns partial data.
 */
export function normalizeToEventEnvelope(
  rawPayload: Record<string, unknown>,
  options: NormalizeOptions = {},
): EventEnvelope {
  const intentId = extractIntentId(rawPayload);
  const tenantId = extractTenantId(rawPayload);

  const now = new Date().toISOString();
  const eventId = crypto.randomUUID();
  const traceId = crypto.randomUUID();

  const rawTimestamp =
    typeof rawPayload["timestamp"] === "string"
      ? rawPayload["timestamp"]
      : now;

  const idempotencyKey =
    typeof rawPayload["idempotency_key"] === "string"
      ? rawPayload["idempotency_key"]
      : `${tenantId}-${intentId}-${rawTimestamp}-${eventId.slice(0, 8)}`;

  const envelope = {
    eventId,
    intentId,
    traceId,
    tenantId,
    idempotencyKey,
    timestamp: rawTimestamp,
    schemaVersion: "1.0.0",
    metadata: {
      rawPayload,
      receivedAt: now,
      sourceIp: options.sourceIp,
      userAgent: options.userAgent,
      ingestChannel: options.channel ?? "api",
    },
  };

  // Validate at boundary — fail-closed
  return EventEnvelopeSchema.parse(envelope);
}
