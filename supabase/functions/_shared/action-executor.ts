/* eslint-disable @typescript-eslint/ban-ts-comment */
// deno-lint-ignore-file no-import-prefix require-await
/**
 * Shared action executor — runs a single typed action (send_email, create_record,
 * webhook, notification) against real external services. Used by both
 * execute-automation (single action) and execute-workflow (a sequence of these
 * same action shapes, run as workflow steps).
 *
 * Security:
 * - Table allowlist for SQL injection prevention (create_record)
 * - URL validation for webhooks (no internal IPs, no redirects)
 * - Timeout protection for external calls
 */
// @ts-ignore: Deno imports are not recognized by standard TS
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { assertUrlSafe } from "./ssrf-protection.ts";

/** Allowed tables for record creation (SQL injection prevention) */
const ALLOWED_TABLES = ["invoices", "logs", "tasks", "notifications"] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

export interface EmailConfig {
  from?: string;
  to: string | string[];
  subject: string;
  body?: string;
  html?: string;
}

export interface CreateRecordConfig {
  table: string;
  data: Record<string, unknown>;
}

export interface WebhookConfig {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  data?: unknown;
}

export interface NotificationConfig {
  message: string;
  channel?: string;
  priority?: "low" | "normal" | "high";
}

export type ActionType = "send_email" | "create_record" | "webhook" | "notification";
export type ActionConfig = EmailConfig | CreateRecordConfig | WebhookConfig | NotificationConfig;

function isEmailConfig(config: unknown): config is EmailConfig {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;
  return typeof c.to === "string" || Array.isArray(c.to);
}

function isCreateRecordConfig(config: unknown): config is CreateRecordConfig {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.table === "string" &&
    c.data !== null &&
    typeof c.data === "object" &&
    !Array.isArray(c.data)
  );
}

function isWebhookConfig(config: unknown): config is WebhookConfig {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;
  return typeof c.url === "string";
}

function isNotificationConfig(config: unknown): config is NotificationConfig {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;
  return typeof c.message === "string";
}

function isAllowedTable(table: string): table is AllowedTable {
  return ALLOWED_TABLES.includes(table as AllowedTable);
}

async function executeEmailAction(config: unknown): Promise<Record<string, unknown>> {
  // @ts-ignore: Deno global
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    throw new Error("Email service not configured");
  }
  if (!isEmailConfig(config)) {
    throw new Error("Invalid email configuration: missing to or subject");
  }
  if (!config.subject || typeof config.subject !== "string") {
    throw new Error("Invalid email configuration: subject is required");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from ?? "noreply@omnilink.app",
      to: config.to,
      subject: config.subject,
      html: config.html ?? config.body ?? "",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email send failed: ${response.status} ${errorText}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

async function executeCreateRecord(
  config: unknown,
  supabase: SupabaseClient,
  userId: string,
): Promise<unknown[]> {
  if (!isCreateRecordConfig(config)) {
    throw new Error("Invalid record configuration: missing table or data");
  }
  const { table, data } = config;

  // SECURITY: Validate table name against allowlist (SQL injection prevention)
  if (!isAllowedTable(table)) {
    throw new Error(
      `Invalid or unauthorized table: ${table}. Allowed tables: ${ALLOWED_TABLES.join(", ")}`,
    );
  }
  if ("user_id" in data && data.user_id !== userId) {
    throw new Error("Record owner mismatch: user_id must match authenticated user");
  }

  const ownedData = { ...data, user_id: userId };
  const { data: result, error } = await supabase.from(table).insert(ownedData).select();
  if (error) {
    throw new Error(`Record creation failed: ${error.message}`);
  }
  return result ?? [];
}

async function parseWebhookResponse(response: Response): Promise<Record<string, unknown>> {
  if (response.status >= 300 && response.status < 400) {
    const redirectUrl = response.headers.get("location");
    if (redirectUrl) {
      throw new Error(
        "Webhook returned a redirect. Automatic redirects are disabled for security. " +
          `If ${redirectUrl} is a trusted destination, update the webhook URL directly.`,
      );
    }
  }
  if (!response.ok) {
    throw new Error(`Webhook request failed: ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as Record<string, unknown>;
  }
  return { text: await response.text() };
}

async function executeWebhook(config: unknown): Promise<Record<string, unknown>> {
  if (!isWebhookConfig(config)) {
    throw new Error("Invalid webhook configuration: URL is required");
  }

  try {
    await assertUrlSafe(config.url, {
      allowPrivate: false,
      allowLoopback: false,
      resolveDns: true,
      dnsTimeoutMs: 5000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "URL failed SSRF validation";
    throw new Error(`Webhook URL blocked by security policy: ${message}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  const requestHeaders: Record<string, string> = { "Content-Type": "application/json" };
  if (config.headers) {
    Object.assign(requestHeaders, config.headers);
  }

  try {
    const response = await fetch(config.url, {
      method: config.method ?? "POST",
      headers: requestHeaders,
      body: config.data ? JSON.stringify(config.data) : undefined,
      signal: controller.signal,
      redirect: "manual",
    });
    return await parseWebhookResponse(response);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Webhook request timed out after 30 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function executeNotification(config: unknown): Promise<Record<string, unknown>> {
  if (!isNotificationConfig(config)) {
    throw new Error("Invalid notification configuration: message is required");
  }
  // Honest Gateway / Completion Proof: notification delivery is not wired to a
  // real channel here. Returning `sent: true` without a durable delivery receipt
  // fabricates completion and lets the workflow record a false success. Until this
  // action is routed through the real delivery/persistence engine (the
  // send-push-notification Edge Function), fail loudly so the workflow records an
  // honest failure instead of fake delivery.
  throw new Error(
    "NOT_IMPLEMENTED: notification delivery is not yet wired to a real channel. " +
      "Route this action through send-push-notification before enabling it. " +
      "This action must never report success without a durable delivery receipt.",
  );
}

/** Runs a single typed action and returns its result. Throws on failure. */
export async function executeAction(
  actionType: ActionType,
  config: unknown,
  supabase: SupabaseClient,
  userId: string,
): Promise<unknown> {
  switch (actionType) {
    case "send_email":
      return await executeEmailAction(config);
    case "create_record":
      return await executeCreateRecord(config, supabase, userId);
    case "webhook":
      return await executeWebhook(config);
    case "notification":
      return await executeNotification(config);
    default:
      throw new Error(`Unknown action type: ${actionType satisfies never}`);
  }
}
