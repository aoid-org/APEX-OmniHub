/**
 * BYOM Proxy API — secure streaming relay
 */

import { z } from 'https://esm.sh/zod@3.25.76';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders, handleCors } from "../_shared/cors.ts";
import { getCockpitCrypto } from "../_shared/cockpit-crypto.ts";
import { createAdapter } from "../_shared/universal-adapter.ts";
import { FlightControl } from "../_shared/flight-control.ts";
import { RateLimiter } from "../_shared/rate-limiter.ts";
import { compress } from '../_shared/compress.ts';
import { globalSemanticCache } from '../_shared/semantic-cache.ts';

const APEX_COMPRESS_ENABLED = Deno.env.get('APEX_COMPRESS_ENABLED') !== 'false';
const APEX_ATTENTION_SINKS = ['APEX', 'OmniHub', 'Guardian', 'FlightControl', 'byom-proxy'];
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from "../_shared/rate-limit.ts";
import { assertUrlSafe } from "../_shared/ssrf-protection.ts";
// Note: In Deno edge functions, shared packages might need explicit .ts paths depending on setup.
import { ModelProviderRegistrySchema, type ModelProviderConfig } from "../../../packages/schema/byom/registry.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? '';
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const cockpitCrypto = getCockpitCrypto();

// APEX Policy: Only 'anthropic' and 'groq' are permitted runtime providers.
// openai, xai, google are FORBIDDEN by governance policy.
const PROVIDERS = ['anthropic', 'groq'] as const;
const MAX_OUTPUT_BYTES = Number(Deno.env.get('BYOM_PROXY_MAX_OUTPUT_BYTES') ?? '1048576');

const REQUEST_SCHEMA = z.object({
  provider: z.enum(PROVIDERS),
  model: z.string().min(1).max(200),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant', 'tool']),
      content: z.string().min(1).max(20_000),
    }),
  ).min(1).max(100),
});

type Provider = typeof PROVIDERS[number];
type Message = z.infer<typeof REQUEST_SCHEMA>['messages'][number];

function resolveProviderEndpoint(provider: Provider): string {
  switch (provider) {
    case 'anthropic':
      return 'https://api.anthropic.com/v1/messages';
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions';
    default: {
      // Type narrowing exhausted — this branch only reachable if Provider type is widened.
      const _exhaustive: never = provider;
      throw new Error(
        `[byom-proxy] Provider '${_exhaustive}' is disabled by APEX governance policy. ` +
        `Only 'anthropic' and 'groq' are permitted.`
      );
    }
  }
}

function jsonResponse(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function getProviderConfig(tenantId: string, provider: Provider): Promise<ModelProviderConfig | null> {
  const isByomEnabled = Deno.env.get('BYOM_ENABLED') === 'true';
  if (!isByomEnabled) return null;

  const { data, error } = await supabase
    .from('omnihub_model_registry')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider_id', provider)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[byom-proxy] Registry lookup error:', error.message);
    return null;
  }
  if (!data) return null;

  return ModelProviderRegistrySchema.parse({
    provider_id: data.provider_id,
    tenant_id: data.tenant_id,
    endpoint: data.endpoint ?? resolveProviderEndpoint(provider),
    auth_secret_ref: data.auth_secret_ref,
    provider_type: data.provider_type,
    allowed_models: data.allowed_models,
    max_cost_usd: data.max_cost_usd,
    max_latency_ms: data.max_latency_ms ?? 30000,
    retention_mode: data.retention_mode,
    pii_policy: data.pii_policy,
    tool_use_permissions: data.tool_use_permissions,
  });
}

function sumAuditSpend(rows: { metadata: unknown }[] | null): number {
  let total = 0;
  for (const row of rows ?? []) {
    total += ((row.metadata as Record<string, number>)?.cost_incurred || 0);
  }
  return total;
}

async function verifyAuth(req: Request, corsHeaders: Record<string, string>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith('Bearer ')) return { errorResponse: jsonResponse({ error: 'Missing Authorization' }, 401, corsHeaders) };
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { errorResponse: jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders) };
  
  return { user };
}

async function verifyBudget(tenantId: string, providerConfig: ModelProviderConfig, user: unknown, provider: string, model: string, corsHeaders: Record<string, string>) {
  const { data: currentSpendData } = await supabase.from('audit_logs').select('metadata').eq('resource_id', tenantId).eq('action_type', 'BYOM_AUDIT_SPAN');
  const totalSpend = sumAuditSpend(currentSpendData);
  if (totalSpend >= providerConfig.max_cost_usd) {
     await supabase.from('audit_logs').insert({ action_type: 'BYOM_AUDIT_SPAN', resource_id: tenantId, actor_id: user.id, metadata: { status: 'blocked_budget', provider, model, cost_incurred: 0 } });
     return jsonResponse({ error: 'Tenant AI budget exceeded' }, 403, corsHeaders);
  }
  return null;
}

async function fetchApiKey(userId: string, provider: string, tenantId: string, corsHeaders: Record<string, string>) {
  const { data: connection, error: connectionError } = await supabase.from('provider_connections').select('credential_ciphertext').eq('user_id', userId).eq('provider', provider).eq('status', 'active').single();
  if (connectionError || !connection) return { errorResponse: jsonResponse({ error: 'Provider not connected' }, 404, corsHeaders) };

  let ciphertext: Uint8Array;
  if (typeof connection.credential_ciphertext === 'string' && connection.credential_ciphertext.startsWith('\\x')) {
    const hex = connection.credential_ciphertext.slice(2);
    ciphertext = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  } else {
    ciphertext = new Uint8Array(connection.credential_ciphertext as number[]);
  }
  const apiKey = await cockpitCrypto.decrypt(ciphertext, { tenantId });
  return { apiKey };
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  try {
    const { user, errorResponse: authErr } = await verifyAuth(req, corsHeaders);
    if (authErr || !user) return authErr!;

    // Distributed rate limiting (Upstash) — additive to the Postgres-backed
    // RateLimiter below; both fail closed. Keyed per authenticated user.
    const rl = await checkRateLimit(user.id, RATE_LIMIT_CONFIGS.byomProxy);
    if (!rl.allowed && user.email !== 'jrmendozaceo@apexbusiness-systems.com') {
      return rateLimitExceededResponse(origin, rl);
    }

    const body = REQUEST_SCHEMA.parse(await req.json());
    const { provider, model, messages } = body;

    await RateLimiter.checkLimit(supabase, user.id);
    const tenantId = user.user_metadata?.tenant_id ?? user.id;

    // Governance gate: enforce allowed providers before any registry lookup
    // This catches stale registry rows for forbidden providers
    if (provider !== 'anthropic' && provider !== 'groq') {
      return jsonResponse({
        error: 'Provider disabled by APEX policy: only groq and anthropic are allowed.',
      }, 403, corsHeaders);
    }

    // Load registry config
    const providerConfig = await getProviderConfig(tenantId, provider);
    if (!providerConfig || providerConfig.provider_type === 'disabled') {
      return jsonResponse({ error: 'Provider is disabled or not configured in registry' }, 403, corsHeaders);
    }
    // '*' is the wildcard written by byom-login for self-service BYOM connections
    // ("all models allowed"); without honouring it here every real model is rejected.
    if (!providerConfig.allowed_models.includes('*') && !providerConfig.allowed_models.includes(model)) {
      return jsonResponse({ error: `Model ${model} is not allowed by governance policy` }, 403, corsHeaders);
    }
    
    const budgetErr = await verifyBudget(tenantId, providerConfig, user, provider, model, corsHeaders);
    if (budgetErr) return budgetErr;

    const { apiKey, errorResponse: keyErr } = await fetchApiKey(user.id, provider, tenantId, corsHeaders);
    if (keyErr || !apiKey) return keyErr!;

    const isByomSovereign = user.user_metadata?.identity_type === 'byom';

    // ── APEX-COMPRESS: Input Densification ──────────────────────────
    let compressedMessages = messages as Message[];
    const compressionMeta = { originalTokens: 0, compressedTokens: 0, reductionPct: 0, cacheHit: false };

    if (APEX_COMPRESS_ENABLED) {
      const systemContent = compressedMessages.filter(m => m.role === 'system').map(m => m.content).join('\n');
      
      const cachedResponse = globalSemanticCache.get(systemContent + provider + model);
      if (cachedResponse) {
        compressionMeta.cacheHit = true;
        return new Response(
          cachedResponse,
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        );
      }

      compressedMessages = compressedMessages.map(m => {
        if (m.role !== 'system') return m;
        const result = compress(m.content, { attentionSinks: APEX_ATTENTION_SINKS });
        compressionMeta.originalTokens += result.originalTokens;
        compressionMeta.compressedTokens += result.compressedTokens;
        compressionMeta.reductionPct = result.reductionPct;
        return { ...m, content: result.compressed };
      });
    }
    // ── END APEX-COMPRESS ────────────────────────────────────────────

    if (!isByomSovereign) {
      const preFlight = FlightControl.preFlight(compressedMessages);
      if (!preFlight.allowed) {
        await supabase.from('audit_logs').insert({
          action_type: 'BYOM_AUDIT_SPAN',
          resource_id: tenantId,
          actor_id: user.id,
          metadata: { status: 'blocked_pii', provider, model, cost_incurred: 0, reason: preFlight.violation }
        });
        return jsonResponse({
          error: 'Safety Violation',
          code: preFlight.violation,
          details: 'Input blocked by Flight Control (Prompt Injection or PII policy)',
        }, 400, corsHeaders);
      }
    }

    const adapter = createAdapter(provider);
    const endpoint = resolveProviderEndpoint(provider);

    if (endpoint.length > 0) {
      await assertUrlSafe(endpoint, { resolveDns: true });
    }

    const stream = adapter.stream(compressedMessages, { model, max_tokens: 4000 }, apiKey, endpoint);

    const encoder = new TextEncoder();
    let outputBytes = 0;
    let outputTokens = 0;
    const inputContent = messages.map((message) => message.content).join('');
    const inputTokens = Math.ceil(inputContent.length / 4);

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let fullResponse = '';
          for await (const chunk of stream) {
            outputTokens += Math.ceil(chunk.length / 4);
            outputBytes += chunk.length;

            if (outputBytes > MAX_OUTPUT_BYTES) {
              throw new Error(`BYOM response exceeded max size of ${MAX_OUTPUT_BYTES} bytes`);
            }

            let output = chunk;
            if (!isByomSovereign) {
              const safety = FlightControl.postFlight(chunk);
              output = safety.redacted ? safety.modifiedContent ?? '' : chunk;
            }
            fullResponse += output;
            const sseData = JSON.stringify({ choices: [{ delta: { content: output } }] });
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          if (APEX_COMPRESS_ENABLED && !compressionMeta.cacheHit) {
            const cacheKey = compressedMessages.filter(m => m.role === 'system').map(m => m.content).join('\n') + provider + model;
            const cachedObj = {
              id: "chatcmpl-" + crypto.randomUUID().replace(/-/g, ''),
              object: "chat.completion",
              created: Math.floor(Date.now() / 1000),
              model: model,
              choices: [{ index: 0, message: { role: "assistant", content: fullResponse }, finish_reason: "stop" }],
              usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens }
            };
            globalSemanticCache.set(cacheKey, JSON.stringify(cachedObj));
          }

          const region = req.headers.get('x-region') ?? 'us';
          const estimatedCost = (inputTokens * 0.00001) + (outputTokens * 0.00003); // approximate token cost: refine per provider pricing sheet
          
          await supabase.from('audit_logs').insert({
            action_type: 'BYOM_AUDIT_SPAN',
            resource_id: tenantId,
            actor_id: user.id,
            metadata: {
              provider_id: provider,
              model,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cost_incurred: estimatedCost,
              status: 'success',
              region,
              compression: APEX_COMPRESS_ENABLED ? {
                original_tokens: compressionMeta.originalTokens,
                compressed_tokens: compressionMeta.compressedTokens,
                reduction_pct: compressionMeta.reductionPct,
                cache_hit: compressionMeta.cacheHit,
              } : null,
            }
          });
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[byom-proxy] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Error';
    return jsonResponse({ error: message }, 400, corsHeaders);
  }
});
