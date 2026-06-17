var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/pages-BvKuwJ/functionsWorker-0.3061519217554447.mjs
var __defProp2 = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __esm = /* @__PURE__ */ __name((fn, res) => /* @__PURE__ */ __name(function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
}, "__init"), "__esm");
async function runGateway(writer, enc, traceId, prompt, ctx, userJwt, supabaseUrl, supabaseAnonKey) {
  const emit = /* @__PURE__ */ __name2(async (event, data) => {
    try {
      await writer.write(enc.encode(`event: ${event}
data: ${JSON.stringify(data)}

`));
    } catch {
    }
  }, "emit");
  try {
    await emit("status", { traceId, status: "queued" });
    const apexAgentUrl = `${supabaseUrl}/functions/v1/apex-agent`;
    let agentResponse;
    try {
      agentResponse = await fetch(apexAgentUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userJwt}`,
          "apikey": supabaseAnonKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: prompt,
          traceId,
          context: ctx
        })
      });
    } catch (err) {
      console.error("[omniport-gateway] apex-agent fetch failed:", err);
      await emit("failed", { traceId, status: "failed", error: "upstream_unavailable" });
      await writer.close();
      return;
    }
    if (agentResponse.status === 401) {
      await emit("failed", { traceId, status: "failed", error: "unauthorized" });
      await writer.close();
      return;
    }
    if (!agentResponse.ok) {
      console.error(`[omniport-gateway] apex-agent returned ${agentResponse.status}`);
      await emit("failed", {
        traceId,
        status: "failed",
        error: `upstream_error_${agentResponse.status}`
      });
      await writer.close();
      return;
    }
    let agentData = {};
    try {
      agentData = await agentResponse.json();
    } catch {
    }
    const workflowId = typeof agentData.workflowId === "string" ? agentData.workflowId : void 0;
    await emit("status", { traceId, status: "running", workflowId });
    const POLL_INTERVAL_MS = 750;
    const TIMEOUT_MS = 9e4;
    const startTime = Date.now();
    while (Date.now() - startTime < TIMEOUT_MS) {
      await sleep(POLL_INTERVAL_MS);
      let rows = [];
      try {
        const pollRes = await fetch(
          `${supabaseUrl}/rest/v1/agent_runs?id=eq.${encodeURIComponent(traceId)}&select=id,status,result,reply,error,workflow_id,completed_at`,
          {
            headers: {
              "Authorization": `Bearer ${userJwt}`,
              "apikey": supabaseAnonKey,
              "Accept": "application/json"
            }
          }
        );
        if (pollRes.ok) {
          rows = await pollRes.json();
        }
      } catch (err) {
        console.warn("[omniport-gateway] poll error:", err);
      }
      const row = rows?.[0];
      if (!row) continue;
      const status = row.status;
      if (status === "completed") {
        const reply = row.reply ?? row.result ?? "";
        await emit("completed", {
          traceId,
          status: "completed",
          reply,
          result: row.result ?? {},
          workflowId: row.workflow_id ?? workflowId
        });
        await writer.close();
        return;
      }
      if (status === "failed") {
        await emit("failed", {
          traceId,
          status: "failed",
          error: sanitizeError(row.error),
          workflowId: row.workflow_id ?? workflowId
        });
        await writer.close();
        return;
      }
    }
    await emit("timeout", {
      traceId,
      status: "timeout",
      workflowId
    });
    await writer.close();
  } catch (err) {
    console.error("[omniport-gateway] runGateway error:", err);
    try {
      await emit("failed", {
        traceId,
        status: "failed",
        error: "internal_gateway_error"
      });
      await writer.close();
    } catch {
    }
  }
}
__name(runGateway, "runGateway");
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
__name(sleep, "sleep");
function isValidUUID(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
__name(isValidUUID, "isValidUUID");
function sanitizeError(err) {
  if (typeof err === "string") {
    return err.replace(/at\s+\w+.*$/gm, "").substring(0, 200).trim();
  }
  return "agent_execution_failed";
}
__name(sanitizeError, "sanitizeError");
function jsonError(message, status, corsHeaders) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
__name(jsonError, "jsonError");
var onRequestPost;
var onRequestOptions;
var init_invoke = __esm({
  "api/mcp/invoke.ts"() {
    "use strict";
    init_functionsRoutes_0_3083585460827023();
    onRequestPost = /* @__PURE__ */ __name2(async (context) => {
      const req = context.request;
      const env = context.env;
      const origin = req.headers.get("Origin") ?? "";
      const corsHeaders = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Vary": "Origin"
      };
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return jsonError("unauthorized", 401, corsHeaders);
      }
      const userJwt = authHeader.slice(7).trim();
      if (!userJwt) return jsonError("unauthorized", 401, corsHeaders);
      const ct = req.headers.get("Content-Type") ?? "";
      if (!ct.includes("application/json")) {
        return jsonError("unsupported_media_type", 415, corsHeaders);
      }
      let body;
      try {
        body = await req.json();
      } catch {
        return jsonError("bad_request", 400, corsHeaders);
      }
      const prompt = body.prompt;
      if (typeof prompt !== "string" || prompt.length < 1 || prompt.length > 2e4) {
        return jsonError("bad_request: prompt must be a string 1\u201320000 chars", 400, corsHeaders);
      }
      const context_ = body.context ?? {};
      if (typeof context_ !== "object" || Array.isArray(context_)) {
        return jsonError("bad_request: context must be a plain object", 400, corsHeaders);
      }
      let traceId;
      if (typeof body.traceId === "string" && isValidUUID(body.traceId)) {
        traceId = body.traceId;
      } else {
        traceId = crypto.randomUUID();
      }
      const providerPreference = body.providerPreference;
      if (providerPreference !== void 0 && providerPreference !== "groq" && providerPreference !== "anthropic") {
      }
      const supabaseUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
      const supabaseAnonKey = env.SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? "";
      if (!supabaseUrl) {
        console.error("[omniport-gateway] SUPABASE_URL not configured");
        return jsonError("server_error", 500, corsHeaders);
      }
      try {
        await fetch(`${supabaseUrl}/rest/v1/agent_runs`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${userJwt}`,
            "apikey": supabaseAnonKey,
            "Content-Type": "application/json",
            "Prefer": "resolution=ignore-duplicates"
          },
          body: JSON.stringify({
            id: traceId,
            status: "queued",
            query: prompt,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          })
        });
      } catch (err) {
        console.error("[omniport-gateway] Failed to insert agent_run:", err);
      }
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const enc = new TextEncoder();
      const sseResponse = new Response(readable, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });
      runGateway(
        writer,
        enc,
        traceId,
        prompt,
        context_,
        userJwt,
        supabaseUrl,
        supabaseAnonKey
      ).catch((err) => {
        console.error("[omniport-gateway] Unhandled gateway error:", err);
        writer.close().catch(() => {
        });
      });
      return sseResponse;
    }, "onRequestPost");
    onRequestOptions = /* @__PURE__ */ __name2(async (context) => {
      const origin = context.request.headers.get("Origin") ?? "";
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }, "onRequestOptions");
    __name2(runGateway, "runGateway");
    __name2(sleep, "sleep");
    __name2(isValidUUID, "isValidUUID");
    __name2(sanitizeError, "sanitizeError");
    __name2(jsonError, "jsonError");
  }
});
async function importKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
__name(importKey, "importKey");
function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
__name(hexToBuffer, "hexToBuffer");
async function validateHMAC(payload, signature, secret) {
  try {
    if (!/^[0-9a-f]{64}$/i.test(signature)) {
      return false;
    }
    const key = await importKey(secret);
    const signatureBytes = hexToBuffer(signature);
    return crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(payload));
  } catch {
    return false;
  }
}
__name(validateHMAC, "validateHMAC");
var encoder;
var init_hmacValidator = __esm({
  "../src/lib/security/hmacValidator.ts"() {
    "use strict";
    init_functionsRoutes_0_3083585460827023();
    encoder = new TextEncoder();
    __name2(importKey, "importKey");
    __name2(hexToBuffer, "hexToBuffer");
    __name2(validateHMAC, "validateHMAC");
  }
});
function validateWebhookShape(w) {
  if (typeof w.source_id !== "string") return false;
  if (typeof w.key_id !== "string") return false;
  if (typeof w.secret_env !== "string") return false;
  if (w.status !== "active" && w.status !== "inactive") return false;
  if (w.profile !== void 0 && w.profile !== "hardened" && w.profile !== "sync_packet") return false;
  if (w.allowed_ips === void 0) return true;
  if (!Array.isArray(w.allowed_ips)) return false;
  for (const ip of w.allowed_ips) {
    if (typeof ip !== "string") return false;
  }
  return true;
}
__name(validateWebhookShape, "validateWebhookShape");
function validateRecord(record) {
  if (!record || typeof record !== "object") return false;
  const r = record;
  if (typeof r.client_id !== "string") return false;
  if (typeof r.client_secret_hash !== "string") return false;
  if (!Array.isArray(r.scopes)) return false;
  for (const s of r.scopes) {
    if (typeof s !== "string") return false;
  }
  if (typeof r.tenant_id !== "string") return false;
  if (r.webhook === void 0) return true;
  const w = r.webhook;
  if (!w || typeof w !== "object") return false;
  return validateWebhookShape(w);
}
__name(validateRecord, "validateRecord");
function parseClients(env) {
  const raw = env.OMNIBRIDGE_M2M_CLIENTS;
  if (!raw) {
    parseErrors.set(env, new Error("OMNIBRIDGE_M2M_CLIENTS is not configured"));
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      parseErrors.set(env, new Error("OMNIBRIDGE_M2M_CLIENTS must be a JSON array"));
      return null;
    }
    const out = [];
    for (const item of parsed) {
      if (!validateRecord(item)) {
        parseErrors.set(env, new Error("Malformed client record"));
        return null;
      }
      out.push(item);
    }
    parseErrors.set(env, null);
    return out;
  } catch (e) {
    parseErrors.set(env, new Error(`Failed to parse OMNIBRIDGE_M2M_CLIENTS: ${e instanceof Error ? e.message : String(e)}`));
    return null;
  }
}
__name(parseClients, "parseClients");
function lastRegistryErrorFromEnv(env) {
  return parseErrors.get(env) ?? null;
}
__name(lastRegistryErrorFromEnv, "lastRegistryErrorFromEnv");
function resolveSyncPacketSourceFromEnv(sourceId, env) {
  const clients = parseClients(env);
  if (!clients) return null;
  for (const client of clients) {
    if (!client.webhook) continue;
    if (client.webhook.source_id !== sourceId) continue;
    if (client.webhook.profile !== "sync_packet") continue;
    if (client.webhook.status !== "active") return null;
    const secret = env[client.webhook.secret_env];
    if (!secret) {
      console.error(`[omnibridge/registryEnv] Secret env ${client.webhook.secret_env} not set for ${sourceId}`);
      return null;
    }
    return { client, webhook: client.webhook, secret };
  }
  return null;
}
__name(resolveSyncPacketSourceFromEnv, "resolveSyncPacketSourceFromEnv");
function resolveHardenedSourceFromEnv(sourceId, keyId, env) {
  const clients = parseClients(env);
  if (!clients) return null;
  for (const client of clients) {
    if (!client.webhook) continue;
    if (client.webhook.source_id !== sourceId) continue;
    if (client.webhook.key_id !== keyId) continue;
    if (client.webhook.profile && client.webhook.profile !== "hardened") continue;
    if (client.webhook.status !== "active") return null;
    const secret = env[client.webhook.secret_env];
    if (!secret) {
      console.error(`[omnibridge/registryEnv] Secret env ${client.webhook.secret_env} not set for ${sourceId}`);
      return null;
    }
    return { client, webhook: client.webhook, secret };
  }
  return null;
}
__name(resolveHardenedSourceFromEnv, "resolveHardenedSourceFromEnv");
var parseErrors;
var init_registryEnv = __esm({
  "../src/lib/omnibridge/registryEnv.ts"() {
    "use strict";
    init_functionsRoutes_0_3083585460827023();
    parseErrors = /* @__PURE__ */ new WeakMap();
    __name2(validateWebhookShape, "validateWebhookShape");
    __name2(validateRecord, "validateRecord");
    __name2(parseClients, "parseClients");
    __name2(lastRegistryErrorFromEnv, "lastRegistryErrorFromEnv");
    __name2(resolveSyncPacketSourceFromEnv, "resolveSyncPacketSourceFromEnv");
    __name2(resolveHardenedSourceFromEnv, "resolveHardenedSourceFromEnv");
  }
});
function extractHardenedHeaders(request) {
  const sourceId = request.headers.get("X-Omni-Source");
  const keyId = request.headers.get("X-Omni-Key-Id");
  const timestamp = request.headers.get("X-Omni-Timestamp");
  const traceId = request.headers.get("X-Omni-Trace-Id");
  const signature = request.headers.get("X-Omni-Signature");
  if (!sourceId || !keyId || !timestamp || !traceId || !signature) {
    return null;
  }
  return { sourceId, keyId, timestamp, traceId, signature };
}
__name(extractHardenedHeaders, "extractHardenedHeaders");
async function computeCanonicalString(method, path, timestamp, traceId, sourceId, bodyRaw) {
  return `${method}
${path}
${timestamp}
${traceId}
${sourceId}
${bodyRaw}`;
}
__name(computeCanonicalString, "computeCanonicalString");
function isTimestampValid(timestampStr, maxSkewSeconds = 300) {
  const ts = Number.parseInt(timestampStr, 10);
  if (Number.isNaN(ts) || ts <= 0) return false;
  const nowSeconds = Math.floor(Date.now() / 1e3);
  const diff = Math.abs(nowSeconds - ts);
  return diff <= maxSkewSeconds;
}
__name(isTimestampValid, "isTimestampValid");
function isIpAllowed(ip, allowedIps) {
  if (!allowedIps || allowedIps.length === 0) return true;
  return allowedIps.includes(ip);
}
__name(isIpAllowed, "isIpAllowed");
function extractClientIp(request) {
  const xff = request.headers.get("X-Forwarded-For");
  if (xff) {
    const ips = xff.split(",");
    const last = ips.pop()?.trim();
    if (last) return last;
  }
  return "unknown";
}
__name(extractClientIp, "extractClientIp");
var init_verifySignedIngress = __esm({
  "../src/lib/omnibridge/verifySignedIngress.ts"() {
    "use strict";
    init_functionsRoutes_0_3083585460827023();
    __name2(extractHardenedHeaders, "extractHardenedHeaders");
    __name2(computeCanonicalString, "computeCanonicalString");
    __name2(isTimestampValid, "isTimestampValid");
    __name2(isIpAllowed, "isIpAllowed");
    __name2(extractClientIp, "extractClientIp");
  }
});
var init_types = __esm({
  "../src/core/types/index.ts"() {
    "use strict";
    init_functionsRoutes_0_3083585460827023();
  }
});
async function acquireAsync(key, meta = {}) {
  const isNew = await _store.insertPending(key, meta);
  if (!isNew) {
    const record = await _store.get(key, meta.tenantId);
    return { isNew: false, record };
  }
  return {
    isNew: true,
    record: {
      key,
      state: "PENDING",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}
__name(acquireAsync, "acquireAsync");
var InMemoryIdempotencyStore;
var _store;
var init_ChronosLock = __esm({
  "../src/core/orchestrator/ChronosLock.ts"() {
    "use strict";
    init_functionsRoutes_0_3083585460827023();
    init_types();
    InMemoryIdempotencyStore = class {
      static {
        __name(this, "InMemoryIdempotencyStore");
      }
      static {
        __name2(this, "InMemoryIdempotencyStore");
      }
      store = /* @__PURE__ */ new Map();
      async get(key) {
        return this.store.get(key) ?? null;
      }
      async insertPending(key) {
        if (this.store.has(key)) return false;
        this.store.set(key, {
          key,
          state: "PENDING",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        return true;
      }
      async complete(key, result) {
        const record = this.store.get(key);
        if (!record || record.state !== "PENDING") return false;
        this.store.set(key, {
          ...record,
          state: "COMPLETED",
          completedAt: (/* @__PURE__ */ new Date()).toISOString(),
          result
        });
        return true;
      }
      async deletePending(key) {
        return this.deletePendingSync(key);
      }
      getSync(key) {
        return this.store.get(key);
      }
      setSync(key, record) {
        this.store.set(key, record);
      }
      deletePendingSync(key) {
        const record = this.store.get(key);
        if (record?.state !== "PENDING") return false;
        this.store.delete(key);
        return true;
      }
      _reset() {
        this.store.clear();
      }
    };
    _store = new InMemoryIdempotencyStore();
    __name2(acquireAsync, "acquireAsync");
  }
});
function getHardenedReplayKey(sourceId, traceId) {
  return `omnibridge:replay:${sourceId}:${traceId}`;
}
__name(getHardenedReplayKey, "getHardenedReplayKey");
function getLegacyIdempotencyKey(key) {
  return `omnibridge:idempotency:${key}`;
}
__name(getLegacyIdempotencyKey, "getLegacyIdempotencyKey");
var DurableReplayStore;
var replayStore;
var init_replayStore = __esm({
  "../src/lib/omnibridge/replayStore.ts"() {
    "use strict";
    init_functionsRoutes_0_3083585460827023();
    init_ChronosLock();
    DurableReplayStore = class {
      static {
        __name(this, "DurableReplayStore");
      }
      static {
        __name2(this, "DurableReplayStore");
      }
      async isDuplicate(key) {
        try {
          const { isNew } = await acquireAsync(key, { toolName: "omnibridge_ingest" });
          return !isNew;
        } catch (e) {
          console.error("ReplayStore failure:", e);
          return true;
        }
      }
    };
    replayStore = new DurableReplayStore();
    __name2(getHardenedReplayKey, "getHardenedReplayKey");
    __name2(getLegacyIdempotencyKey, "getLegacyIdempotencyKey");
  }
});
function normalizeHardenedEvent(rawPayload, tenantId, timestamp, traceId, sourceId, eventId, idempotencyKey) {
  if (typeof rawPayload.event_type !== "string" || !rawPayload.event_type) {
    throw new Error("FAIL_CLOSED: Missing event_type in hardened payload");
  }
  return {
    event_id: eventId,
    event_type: rawPayload.event_type,
    tenant_id: tenantId,
    // Strict match from registry overrides payload tenant
    timestamp,
    payload: rawPayload.payload && typeof rawPayload.payload === "object" && !Array.isArray(rawPayload.payload) ? rawPayload.payload : rawPayload,
    // Default to the whole body if it doesn't wrap inside "payload"
    idempotency_key: idempotencyKey ?? null,
    trace_id: traceId,
    source_id: sourceId,
    received_at: (/* @__PURE__ */ new Date()).toISOString(),
    delivery_status: "normalized"
  };
}
__name(normalizeHardenedEvent, "normalizeHardenedEvent");
function normalizeLegacyEvent(rawPayload, eventId) {
  if (typeof rawPayload.event_type !== "string" || !rawPayload.event_type) {
    throw new Error("FAIL_CLOSED: Missing event_type in legacy payload");
  }
  if (typeof rawPayload.tenant_id !== "string" || !rawPayload.tenant_id) {
    throw new Error("FAIL_CLOSED: Missing tenant_id in legacy payload");
  }
  if (typeof rawPayload.timestamp !== "string" || !rawPayload.timestamp) {
    throw new Error("FAIL_CLOSED: Missing timestamp in legacy payload");
  }
  if (!rawPayload.payload || typeof rawPayload.payload !== "object" || Array.isArray(rawPayload.payload)) {
    throw new Error("FAIL_CLOSED: Missing or invalid payload object in legacy payload");
  }
  if (Number.isNaN(Date.parse(rawPayload.timestamp))) {
    throw new Error("FAIL_CLOSED: Invalid timestamp format");
  }
  let idempotencyKey = null;
  if (rawPayload.idempotency_key !== void 0) {
    if (typeof rawPayload.idempotency_key !== "string") {
      throw new Error("FAIL_CLOSED: idempotency_key must be a string");
    }
    idempotencyKey = rawPayload.idempotency_key;
  }
  return {
    event_id: eventId,
    event_type: rawPayload.event_type,
    tenant_id: rawPayload.tenant_id,
    timestamp: rawPayload.timestamp,
    payload: rawPayload.payload,
    idempotency_key: idempotencyKey,
    trace_id: null,
    source_id: null,
    received_at: (/* @__PURE__ */ new Date()).toISOString(),
    delivery_status: "normalized"
  };
}
__name(normalizeLegacyEvent, "normalizeLegacyEvent");
var init_eventEnvelope = __esm({
  "../src/lib/omnibridge/eventEnvelope.ts"() {
    "use strict";
    init_functionsRoutes_0_3083585460827023();
    __name2(normalizeHardenedEvent, "normalizeHardenedEvent");
    __name2(normalizeLegacyEvent, "normalizeLegacyEvent");
  }
});
function readSupabaseConfig(env) {
  const source = env ?? (typeof process !== "undefined" ? process.env : {});
  const url = source.SUPABASE_URL ?? source.VITE_SUPABASE_URL;
  const serviceKey = source.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) return { url, serviceKey };
  return null;
}
__name(readSupabaseConfig, "readSupabaseConfig");
async function persistEvent(input, env) {
  const cfg = readSupabaseConfig(env);
  if (!cfg) {
    return { ok: false, reason: "config_missing", detail: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set" };
  }
  const body = [{
    event_id: input.event_id,
    source_id: input.source_id,
    tenant_id: input.tenant_id,
    profile: input.profile,
    event_type: input.event_type,
    trace_id: input.trace_id ?? null,
    idempotency_key: input.idempotency_key ?? null,
    payload: input.payload,
    raw_headers: input.raw_headers ?? null,
    signature_verified: input.signature_verified
  }];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HARDCODED_TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.url}/rest/v1/omnibridge_events?on_conflict=source_id,event_id`, {
      method: "POST",
      headers: {
        "apikey": cfg.serviceKey,
        "Authorization": `Bearer ${cfg.serviceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=ignore-duplicates"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, reason: "upstream_error", detail: `${res.status} ${text.slice(0, 200)}` };
    }
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      const lookup = await fetch(
        `${cfg.url}/rest/v1/omnibridge_events?source_id=eq.${encodeURIComponent(input.source_id)}&event_id=eq.${encodeURIComponent(input.event_id)}&select=id`,
        { headers: { "apikey": cfg.serviceKey, "Authorization": `Bearer ${cfg.serviceKey}` } }
      );
      if (!lookup.ok) {
        return { ok: false, reason: "upstream_error", detail: `duplicate lookup failed: ${lookup.status}` };
      }
      const existing = await lookup.json();
      if (!existing[0]) {
        return { ok: false, reason: "conflict", detail: "duplicate with no persisted row" };
      }
      return { ok: true, event_uuid: existing[0].id, duplicate: true };
    }
    return { ok: true, event_uuid: rows[0].id, duplicate: false };
  } catch (e) {
    return { ok: false, reason: "upstream_error", detail: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}
__name(persistEvent, "persistEvent");
var HARDCODED_TIMEOUT_MS;
var init_eventStore = __esm({
  "../src/lib/omnibridge/eventStore.ts"() {
    "use strict";
    init_functionsRoutes_0_3083585460827023();
    HARDCODED_TIMEOUT_MS = 3e3;
    __name2(readSupabaseConfig, "readSupabaseConfig");
    __name2(persistEvent, "persistEvent");
  }
});
function redactUnsafeResponseValue(value) {
  if (value instanceof Error) {
    return { name: value.name || "Error" };
  }
  if (Array.isArray(value)) {
    return value.map(redactUnsafeResponseValue);
  }
  if (value !== null && typeof value === "object") {
    const redacted = {};
    for (const [key, childValue] of Object.entries(value)) {
      if (/^(stack|cause)$/i.test(key)) continue;
      redacted[key] = redactUnsafeResponseValue(childValue);
    }
    return redacted;
  }
  return value;
}
__name(redactUnsafeResponseValue, "redactUnsafeResponseValue");
function jsonResponse(status, body) {
  return new Response(JSON.stringify(redactUnsafeResponseValue(body)), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonResponse, "jsonResponse");
function makeLogger(module) {
  return (deny, reason, meta) => {
    const line = `[${module}] ${deny ? "DENY" : "ACCEPT"}: ${reason} | ${JSON.stringify(meta)}`;
    if (deny) console.error(line);
    else console.warn(line);
  };
}
__name(makeLogger, "makeLogger");
function sanitize(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("__")) continue;
    if (typeof v === "string" && /<script/i.test(v)) continue;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = sanitize(v);
    } else if (Array.isArray(v)) {
      out[k] = v.map((item) => {
        if (item !== null && typeof item === "object" && !Array.isArray(item)) {
          return sanitize(item);
        }
        if (typeof item === "string" && /<script/i.test(item)) return void 0;
        return item;
      }).filter((item) => item !== void 0);
    } else {
      out[k] = v;
    }
  }
  return out;
}
__name(sanitize, "sanitize");
var init_httpUtils = __esm({
  "../src/lib/omnibridge/httpUtils.ts"() {
    "use strict";
    init_functionsRoutes_0_3083585460827023();
    __name2(redactUnsafeResponseValue, "redactUnsafeResponseValue");
    __name2(jsonResponse, "jsonResponse");
    __name2(makeLogger, "makeLogger");
    __name2(sanitize, "sanitize");
  }
});
function generateSecureId() {
  return crypto.randomUUID();
}
__name(generateSecureId, "generateSecureId");
function toErrorMessage(e) {
  return e instanceof Error ? e.message : String(e);
}
__name(toErrorMessage, "toErrorMessage");
function isTenantMismatch(parsedBody, expectedTenantId) {
  return !!parsedBody.tenant_id && parsedBody.tenant_id !== expectedTenantId;
}
__name(isTenantMismatch, "isTenantMismatch");
async function handleHardenedIngress(request, rawBody, headers, env) {
  const { sourceId, keyId, timestamp, traceId, signature } = headers;
  const meta = { mode: "hardened", source_id: sourceId, trace_id: traceId };
  if (!isTimestampValid(timestamp, 300)) {
    logEvent(true, "invalid_timestamp", meta);
    return jsonResponse(400, { error: "invalid_timestamp" });
  }
  const replayKey = getHardenedReplayKey(sourceId, traceId);
  if (await replayStore.isDuplicate(replayKey)) {
    logEvent(true, "replay_detected", meta);
    return jsonResponse(409, { error: "replay_detected" });
  }
  const resolution = resolveHardenedSourceFromEnv(sourceId, keyId, env);
  if (lastRegistryErrorFromEnv(env)) {
    logEvent(true, "server_config_error", meta);
    return jsonResponse(500, { error: "server_config_error" });
  }
  if (!resolution) {
    logEvent(true, "invalid_key_id", meta);
    return jsonResponse(401, { error: "invalid_key_id" });
  }
  const clientIp = extractClientIp(request);
  if (!isIpAllowed(clientIp, resolution.webhook.allowed_ips)) {
    logEvent(true, "ip_not_allowed", { ...meta, client_ip: clientIp });
    return jsonResponse(403, { error: "ip_not_allowed" });
  }
  const path = new URL(request.url).pathname;
  const canonical = await computeCanonicalString(request.method, path, timestamp, traceId, sourceId, rawBody);
  if (!await validateHMAC(canonical, signature, resolution.secret)) {
    logEvent(true, "invalid_signature", meta);
    return jsonResponse(401, { error: "invalid_signature" });
  }
  let parsedBody;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    logEvent(true, "invalid_json", meta);
    return jsonResponse(400, { error: "invalid_json" });
  }
  let eventEnvelope;
  try {
    const idempotencyKey = typeof parsedBody.idempotency_key === "string" ? parsedBody.idempotency_key : void 0;
    eventEnvelope = normalizeHardenedEvent(
      parsedBody,
      resolution.client.tenant_id,
      timestamp,
      traceId,
      sourceId,
      generateSecureId(),
      idempotencyKey
    );
  } catch (e) {
    logEvent(true, "invalid_payload", { ...meta, error: toErrorMessage(e) });
    return jsonResponse(400, { error: "invalid_payload" });
  }
  if (isTenantMismatch(parsedBody, resolution.client.tenant_id)) {
    logEvent(true, "tenant_mismatch", meta);
    return jsonResponse(403, { error: "tenant_mismatch" });
  }
  eventEnvelope.payload = sanitize(eventEnvelope.payload);
  const persist = await persistEvent({
    event_id: eventEnvelope.event_id,
    source_id: sourceId,
    tenant_id: resolution.client.tenant_id,
    profile: "hardened",
    event_type: eventEnvelope.event_type,
    trace_id: eventEnvelope.trace_id,
    idempotency_key: eventEnvelope.idempotency_key,
    payload: eventEnvelope.payload,
    raw_headers: {
      "x-omni-source": sourceId,
      "x-omni-key-id": keyId,
      "x-omni-timestamp": timestamp,
      "x-omni-trace-id": traceId
    },
    signature_verified: true
  }, env);
  if (!persist.ok) {
    if (persist.reason === "config_missing") {
      logEvent(false, "event_received_no_store", meta);
      return jsonResponse(200, { received: true, event_id: eventEnvelope.event_id, stored: false });
    }
    logEvent(true, `persist_failed:${persist.reason}`, { ...meta, detail: persist.detail });
    return jsonResponse(502, { error: "persist_failed", reason: persist.reason });
  }
  logEvent(false, persist.duplicate ? "idempotent_accept" : "event_persisted", { ...meta, event_uuid: persist.event_uuid });
  return jsonResponse(200, {
    received: true,
    event_id: eventEnvelope.event_id,
    event_uuid: persist.event_uuid,
    duplicate: persist.duplicate
  });
}
__name(handleHardenedIngress, "handleHardenedIngress");
async function handleLegacyIngress(request, rawBody, env) {
  const allowLegacy = env.OMNIBRIDGE_ALLOW_LEGACY_SINGLE_SECRET === "true";
  if (!allowLegacy) {
    const hasAnyHardened = request.headers.has("X-Omni-Source") || request.headers.has("X-Omni-Key-Id");
    if (hasAnyHardened) {
      return jsonResponse(401, { error: "missing_signature" });
    }
    return jsonResponse(403, { error: "legacy_mode_disabled" });
  }
  const legacySignature = request.headers.get("X-OmniBridge-Signature");
  if (!legacySignature) return jsonResponse(401, { error: "missing_signature" });
  const webhookSecret = env.OMNIBRIDGE_WEBHOOK_SECRET;
  if (!webhookSecret) return jsonResponse(500, { error: "server_config_error" });
  if (!await validateHMAC(rawBody, legacySignature, webhookSecret)) {
    return jsonResponse(401, { error: "invalid_signature" });
  }
  let parsedBody;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }
  let envelope;
  try {
    envelope = normalizeLegacyEvent(parsedBody, generateSecureId());
  } catch (e) {
    console.warn("[omnibridge/ingest] normalizeLegacyEvent failed", e);
    return jsonResponse(400, { error: "invalid_payload" });
  }
  if (envelope.idempotency_key) {
    const key = getLegacyIdempotencyKey(envelope.idempotency_key);
    if (await replayStore.isDuplicate(key)) {
      return jsonResponse(200, { received: true, event_id: envelope.event_id, duplicate: true });
    }
  }
  envelope.payload = sanitize(envelope.payload);
  return jsonResponse(200, { received: true, event_id: envelope.event_id });
}
__name(handleLegacyIngress, "handleLegacyIngress");
var logEvent;
var onRequestPost2;
var onRequest;
var init_ingest = __esm({
  "api/omnibridge/ingest.ts"() {
    "use strict";
    init_functionsRoutes_0_3083585460827023();
    init_hmacValidator();
    init_registryEnv();
    init_verifySignedIngress();
    init_replayStore();
    init_eventEnvelope();
    init_eventStore();
    init_httpUtils();
    __name2(generateSecureId, "generateSecureId");
    logEvent = makeLogger("omnibridge/ingest");
    __name2(toErrorMessage, "toErrorMessage");
    __name2(isTenantMismatch, "isTenantMismatch");
    __name2(handleHardenedIngress, "handleHardenedIngress");
    __name2(handleLegacyIngress, "handleLegacyIngress");
    onRequestPost2 = /* @__PURE__ */ __name2(async ({ request, env }) => {
      const rawBody = await request.text();
      const hardenedHeaders = extractHardenedHeaders(request);
      if (hardenedHeaders) {
        return handleHardenedIngress(request, rawBody, hardenedHeaders, env);
      }
      return handleLegacyIngress(request, rawBody, env);
    }, "onRequestPost");
    onRequest = /* @__PURE__ */ __name2(async ({ request, env }) => {
      if (request.method !== "POST") {
        return jsonResponse(405, { error: "method_not_allowed" });
      }
      return onRequestPost2({ request, env });
    }, "onRequest");
  }
});
function base64UrlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padLen = (4 - value.length % 4) % 4;
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(padLen);
  try {
    const binary = atob(normalized);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.codePointAt(i) ?? 0;
    return out;
  } catch {
    return null;
  }
}
__name(base64UrlToBytes, "base64UrlToBytes");
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
__name(isRecord, "isRecord");
function hasRequiredPacketStrings(packet) {
  return SYNC_PACKET_STRING_FIELDS.every((field) => typeof packet[field] === "string" && packet[field].length > 0);
}
__name(hasRequiredPacketStrings, "hasRequiredPacketStrings");
function isSyncPacketEnvelope(value) {
  if (!isRecord(value) || typeof value.signature !== "string" || value.signature.length === 0) return false;
  if (!isRecord(value.packet) || !hasRequiredPacketStrings(value.packet)) return false;
  if (!isRecord(value.packet.payload)) return false;
  return (value.packet.entity_id === null || typeof value.packet.entity_id === "string") && (value.packet.league_id === null || typeof value.packet.league_id === "string");
}
__name(isSyncPacketEnvelope, "isSyncPacketEnvelope");
function isEmittedAtValid(emittedAt, maxSkewSeconds) {
  const ms = Date.parse(emittedAt);
  if (Number.isNaN(ms)) return false;
  const nowMs = Date.now();
  return Math.abs(nowMs - ms) <= maxSkewSeconds * 1e3;
}
__name(isEmittedAtValid, "isEmittedAtValid");
async function verifySyncPacket(envelope, secret, options = {}) {
  const maxSkewSeconds = options.maxSkewSeconds ?? 300;
  if (!isSyncPacketEnvelope(envelope)) {
    return { valid: false, reason: "malformed" };
  }
  if (!isEmittedAtValid(envelope.packet.emitted_at, maxSkewSeconds)) {
    return { valid: false, reason: "expired" };
  }
  const sigBytes = base64UrlToBytes(envelope.signature);
  if (!sigBytes) {
    return { valid: false, reason: "bad_signature" };
  }
  const canonicalBody = JSON.stringify(envelope.packet);
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder2.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const ok = await crypto.subtle.verify("HMAC", key, sigBytes, encoder2.encode(canonicalBody));
    return ok ? { valid: true } : { valid: false, reason: "bad_signature" };
  } catch {
    return { valid: false, reason: "bad_signature" };
  }
}
__name(verifySyncPacket, "verifySyncPacket");
var encoder2;
var SYNC_PACKET_STRING_FIELDS;
var init_syncPacketVerifier = __esm({
  "../src/lib/omnibridge/syncPacketVerifier.ts"() {
    "use strict";
    init_functionsRoutes_0_3083585460827023();
    encoder2 = new TextEncoder();
    __name2(base64UrlToBytes, "base64UrlToBytes");
    SYNC_PACKET_STRING_FIELDS = ["packet_id", "trace_id", "event_type", "entity_type", "emitted_at"];
    __name2(isRecord, "isRecord");
    __name2(hasRequiredPacketStrings, "hasRequiredPacketStrings");
    __name2(isSyncPacketEnvelope, "isSyncPacketEnvelope");
    __name2(isEmittedAtValid, "isEmittedAtValid");
    __name2(verifySyncPacket, "verifySyncPacket");
  }
});
function verifyErrorResponse(reason) {
  const status = reason === "expired" ? 400 : 401;
  return jsonResponse(status, { error: reason ?? "invalid_signature" });
}
__name(verifyErrorResponse, "verifyErrorResponse");
var logEvent2;
var onRequestPost3;
var onRequest2;
var init_sync = __esm({
  "api/omnibridge/sync.ts"() {
    "use strict";
    init_functionsRoutes_0_3083585460827023();
    init_syncPacketVerifier();
    init_registryEnv();
    init_replayStore();
    init_eventStore();
    init_verifySignedIngress();
    init_httpUtils();
    logEvent2 = makeLogger("omnibridge/sync");
    __name2(verifyErrorResponse, "verifyErrorResponse");
    onRequestPost3 = /* @__PURE__ */ __name2(async ({ request, env }) => {
      const sourceId = request.headers.get("X-Omni-Source");
      if (!sourceId) {
        logEvent2(true, "missing_source_header", {});
        return jsonResponse(400, { error: "missing_source_header" });
      }
      const resolution = resolveSyncPacketSourceFromEnv(sourceId, env);
      if (lastRegistryErrorFromEnv(env)) {
        logEvent2(true, "server_config_error", { source_id: sourceId });
        return jsonResponse(500, { error: "server_config_error" });
      }
      if (!resolution) {
        logEvent2(true, "unknown_source", { source_id: sourceId });
        return jsonResponse(401, { error: "unknown_source" });
      }
      const clientIp = extractClientIp(request);
      if (!isIpAllowed(clientIp, resolution.webhook.allowed_ips)) {
        logEvent2(true, "ip_not_allowed", { source_id: sourceId, client_ip: clientIp });
        return jsonResponse(403, { error: "ip_not_allowed" });
      }
      let rawBody;
      try {
        rawBody = await request.text();
      } catch {
        return jsonResponse(400, { error: "body_read_failed" });
      }
      if (rawBody.length > 256 * 1024) {
        logEvent2(true, "body_too_large", { source_id: sourceId, bytes: rawBody.length });
        return jsonResponse(413, { error: "body_too_large" });
      }
      let parsed;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        logEvent2(true, "invalid_json", { source_id: sourceId });
        return jsonResponse(400, { error: "invalid_json" });
      }
      if (!isSyncPacketEnvelope(parsed)) {
        logEvent2(true, "invalid_envelope", { source_id: sourceId });
        return jsonResponse(400, { error: "invalid_envelope" });
      }
      const envelope = parsed;
      const replayKey = getHardenedReplayKey(sourceId, envelope.packet.packet_id);
      if (await replayStore.isDuplicate(replayKey)) {
        logEvent2(true, "replay_detected", { source_id: sourceId, packet_id: envelope.packet.packet_id });
        return jsonResponse(409, { error: "replay_detected" });
      }
      const verify = await verifySyncPacket(envelope, resolution.secret);
      if (!verify.valid) {
        logEvent2(true, `verify_failed:${verify.reason ?? "unknown"}`, {
          source_id: sourceId,
          packet_id: envelope.packet.packet_id
        });
        return verifyErrorResponse(verify.reason);
      }
      const cleanPayload = sanitize(envelope.packet.payload);
      const persist = await persistEvent({
        event_id: envelope.packet.packet_id,
        source_id: sourceId,
        tenant_id: resolution.client.tenant_id,
        profile: "sync_packet",
        event_type: envelope.packet.event_type,
        trace_id: envelope.packet.trace_id,
        idempotency_key: envelope.packet.packet_id,
        payload: {
          entity_type: envelope.packet.entity_type,
          entity_id: envelope.packet.entity_id,
          league_id: envelope.packet.league_id,
          emitted_at: envelope.packet.emitted_at,
          data: cleanPayload
        },
        raw_headers: {
          "x-omni-source": sourceId,
          "x-forwarded-for": request.headers.get("X-Forwarded-For") ?? ""
        },
        signature_verified: true
      }, env);
      if (!persist.ok) {
        logEvent2(true, `persist_failed:${persist.reason}`, {
          source_id: sourceId,
          packet_id: envelope.packet.packet_id,
          detail: persist.detail
        });
        return jsonResponse(persist.reason === "config_missing" ? 500 : 502, {
          error: "persist_failed",
          reason: persist.reason
        });
      }
      logEvent2(false, persist.duplicate ? "idempotent_accept" : "event_persisted", {
        source_id: sourceId,
        packet_id: envelope.packet.packet_id,
        tenant_id: resolution.client.tenant_id,
        event_uuid: persist.event_uuid
      });
      return jsonResponse(202, {
        received: true,
        event_uuid: persist.event_uuid,
        packet_id: envelope.packet.packet_id,
        duplicate: persist.duplicate
      });
    }, "onRequestPost");
    onRequest2 = /* @__PURE__ */ __name2(async ({ request, env }) => {
      if (request.method !== "POST") {
        return jsonResponse(405, { error: "method_not_allowed" });
      }
      return onRequestPost3({ request, env });
    }, "onRequest");
  }
});
var routes;
var init_functionsRoutes_0_3083585460827023 = __esm({
  "../.wrangler/tmp/pages-BvKuwJ/functionsRoutes-0.3083585460827023.mjs"() {
    "use strict";
    init_invoke();
    init_invoke();
    init_ingest();
    init_sync();
    init_ingest();
    init_sync();
    routes = [
      {
        routePath: "/api/mcp/invoke",
        mountPath: "/api/mcp",
        method: "OPTIONS",
        middlewares: [],
        modules: [onRequestOptions]
      },
      {
        routePath: "/api/mcp/invoke",
        mountPath: "/api/mcp",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost]
      },
      {
        routePath: "/api/omnibridge/ingest",
        mountPath: "/api/omnibridge",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost2]
      },
      {
        routePath: "/api/omnibridge/sync",
        mountPath: "/api/omnibridge",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost3]
      },
      {
        routePath: "/api/omnibridge/ingest",
        mountPath: "/api/omnibridge",
        method: "",
        middlewares: [],
        modules: [onRequest]
      },
      {
        routePath: "/api/omnibridge/sync",
        mountPath: "/api/omnibridge",
        method: "",
        middlewares: [],
        modules: [onRequest2]
      }
    ];
  }
});
init_functionsRoutes_0_3083585460827023();
init_functionsRoutes_0_3083585460827023();
init_functionsRoutes_0_3083585460827023();
init_functionsRoutes_0_3083585460827023();
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
init_functionsRoutes_0_3083585460827023();
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
init_functionsRoutes_0_3083585460827023();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError2 = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError2;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
init_functionsRoutes_0_3083585460827023();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError3 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError3;

// .wrangler/tmp/bundle-Mn4UEm/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-Mn4UEm/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
/**
 * HMAC-SHA256 Signature Validation Utility
 *
 * Edge-compatible (Web Crypto API only) HMAC generation and validation
 * with constant-time comparison to prevent timing attacks.
 *
 * @module lib/security/hmacValidator
 * @license Proprietary - APEX Business Systems Ltd.
 */
/**
 * Env-parameterized source registry resolution.
 *
 * The canonical sourceRegistry.ts reads process.env and caches. That works
 * on Node (tests) and Vercel Edge, but Cloudflare Pages Functions pass env
 * via context.env and don't populate process.env.
 *
 * This module provides env-aware versions used by the functions/ directory.
 * It intentionally does NOT cache across requests (each CF Pages Function
 * invocation may run on a different isolate / with different env snapshot).
 *
 * @module lib/omnibridge/registryEnv
 * @license Proprietary - APEX Business Systems Ltd.
 */
/**
 * Hardened Request Verification Pipeline
 *
 * Implements the source-aware signed ingress logic for SBBL HQ and future
 * partners in a Vercel Edge compatible way.
 *
 * @module lib/omnibridge/verifySignedIngress
 * @license Proprietary - APEX Business Systems Ltd.
 */
/**
 * Idempotency & Replay Store for OmniBridge
 *
 * Provides best-effort deduplication within a single Vercel Edge isolate.
 * Keys on source_id + trace_id for hardened mode.
 *
 * @module lib/omnibridge/replayStore
 * @license Proprietary - APEX Business Systems Ltd.
 */
/**
 * Event Envelope Normalization for OmniBridge
 *
 * Runtime-safe helper to normalize incoming payload shapes into a predictable
 * structured event. This preserves inbound tracing, idempotency, and tenant identifiers,
 * ensuring failure on malformed input.
 *
 * Designed to replace or standardize the legacy direct parsing from ingest.ts.
 *
 * @module lib/omnibridge/eventEnvelope
 * @license Proprietary - APEX Business Systems Ltd.
 */
/**
 * OmniBridge Event Store — durable event persistence.
 *
 * Called by both the hardened and sync_packet ingress profiles after signature
 * verification succeeds.
 *
 * Design:
 *   - Writes every verified event to omnibridge_events (idempotent on
 *     (source_id, event_id)).
 *   - Edge-safe: uses fetch (no SDK). The service role key is provided via env
 *     and is never logged. Callers run on Cloudflare Pages Functions and POST
 *     to Supabase PostgREST directly.
 *
 * Fail-closed: a persistence failure surfaces to the caller so the partner
 * receives a 5xx and retries.
 *
 * Dispatch infrastructure: recordDispatchFailure() and updateDispatchState()
 * are implemented and available but are NOT wired in production ingress paths.
 * They must be called explicitly by an orchestrator dispatch layer when that
 * integration is activated.
 *
 * @module lib/omnibridge/eventStore
 * @license Proprietary - APEX Business Systems Ltd.
 */
/**
 * Shared HTTP utilities for OmniBridge CF Pages Functions.
 * Eliminates duplication between functions/api/omnibridge/sync.ts and ingest.ts.
 *
 * @module lib/omnibridge/httpUtils
 * @license Proprietary - APEX Business Systems Ltd.
 */
/**
 * CF Pages Function: POST /api/omnibridge/ingest
 *
 * Hardened 5-header HMAC ingress (existing contract, now on CF Pages).
 * Mirrors the prior api/omnibridge/ingest.ts but uses the CF Pages
 * onRequestPost signature + context.env binding. The underlying
 * verification + canonical-string logic is unchanged.
 *
 * @module functions/api/omnibridge/ingest
 * @license Proprietary - APEX Business Systems Ltd.
 */
/**
 * SBBL-HQ Native Sync Packet Verifier
 *
 * Accepts SBBL-HQ's native outbound format produced by
 * sbbl-hq/src/lib/sync-packets.ts::signSyncPacket:
 *
 *   Body:  { packet: SyncPacket, signature: base64url(HMAC-SHA256(secret, JSON.stringify(packet))) }
 *
 * Edge-compatible (Web Crypto API only). Constant-time verification via
 * crypto.subtle.verify.
 *
 * @module lib/omnibridge/syncPacketVerifier
 * @license Proprietary - APEX Business Systems Ltd.
 */
/**
 * CF Pages Function: POST /api/omnibridge/sync
 *
 * SBBL-HQ native sync packet ingress. Cloudflare Pages Functions runtime.
 * Equivalent to the previous api/omnibridge/sync.ts (Vercel Edge) — same
 * verification pipeline, but rebound to CF Pages's onRequestPost signature
 * and context.env binding.
 *
 * Bindings required (set in Cloudflare Pages dashboard → Settings → Environment variables):
 *   OMNIBRIDGE_M2M_CLIENTS                       (registry JSON)
 *   OMNIBRIDGE_SBBL_NATIVE_SECRET                (HMAC secret)
 *   SUPABASE_URL                                  (for persistence)
 *   SUPABASE_SERVICE_ROLE_KEY                     (for persistence)
 *
 * @module functions/api/omnibridge/sync
 * @license Proprietary - AP