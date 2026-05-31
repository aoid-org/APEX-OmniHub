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
import { assertUrlSafe } from "../_shared/ssrf-protection.ts";
// Note: In Deno edge functions, shared packages might need explicit .ts paths depending on setup.
import { ModelProviderRegistrySchema, type ModelProviderConfig } from "../../packages/schema/byom/registry.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? '';
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const cockpitCrypto = getCockpitCrypto();

const PROVIDERS = ['openai', 'xai', 'anthropic', 'google'] as const;
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
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'xai':
      return 'https://api.x.ai/v1/chat/completions';
    case 'anthropic':
      return 'https://api.anthropic.com/v1/messages';
    case 'google':
      return '';
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

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing Authorization' }, 401, corsHeaders);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    }

    const body = REQUEST_SCHEMA.parse(await req.json());
    const { provider, model, messages } = body;

    await RateLimiter.checkLimit(supabase, user.id);

    const tenantId = user.user_metadata?.tenant_id ?? user.id;

    // Load registry config
    const providerConfig = await getProviderConfig(tenantId, provider);
    if (!providerConfig || providerConfig.provider_type === 'disabled') {
      return jsonResponse({ error: 'Provider is disabled or not configured in registry' }, 403, corsHeaders);
    }

    if (!providerConfig.allowed_models.includes(model)) {
      return jsonResponse({ error: `Model ${model} is not allowed by governance policy` }, 403, corsHeaders);
    }
    
    // Check tenant accumulated spend against registry budget cap
    const { data: currentSpendData } = await supabase
      .from('omnihub_audit_log')
      .select('details')
      .eq('tenant_id', tenantId)
      .eq('action', 'BYOM_AUDIT_SPAN');
      
    let totalSpend = 0;
    if (currentSpendData) {
      for (const row of currentSpendData) {
         totalSpend += ((row.details as Record<string, number>)?.cost_incurred || 0);
      }
    }
    
    if (totalSpend >= providerConfig.max_cost_usd) {
       // Log rejection
       await supabase.from('omnihub_audit_log').insert({
         action: 'BYOM_AUDIT_SPAN',
         tenant_id: tenantId,
         actor_id: user.id,
         details: { status: 'blocked_budget', provider, model, cost_incurred: 0 }
       });
       return jsonResponse({ error: 'Tenant AI budget exceeded' }, 403, corsHeaders);
    }

    const { data: connection, error: connectionError } = await supabase
      .from('provider_connections')
      .select('credential_ciphertext')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('status', 'active')
      .single();

    if (connectionError || !connection) {
      return jsonResponse({ error: 'Provider not connected' }, 404, corsHeaders);
    }

    const ciphertext = new Uint8Array(connection.credential_ciphertext as number[]);
    const apiKey = await cockpitCrypto.decrypt(ciphertext, { tenantId });

    const preFlight = FlightControl.preFlight(messages as Message[]);
    if (!preFlight.allowed) {
      await supabase.from('omnihub_audit_log').insert({
        action: 'BYOM_AUDIT_SPAN',
        tenant_id: tenantId,
        actor_id: user.id,
        details: { status: 'blocked_pii', provider, model, cost_incurred: 0, reason: preFlight.violation }
      });
      return jsonResponse({
        error: 'Safety Violation',
        code: preFlight.violation,
        details: 'Input blocked by Flight Control (Prompt Injection or PII policy)',
      }, 400, corsHeaders);
    }

    const adapter = createAdapter(provider);
    const endpoint = resolveProviderEndpoint(provider);

    if (endpoint.length > 0) {
      await assertUrlSafe(endpoint, { resolveDns: true });
    }

    const stream = adapter.stream(messages as Message[], { model, max_tokens: 4000 }, apiKey, endpoint);

    const encoder = new TextEncoder();
    let outputBytes = 0;
    let outputTokens = 0;
    const inputContent = messages.map((message) => message.content).join('');
    const inputTokens = Math.ceil(inputContent.length / 4);

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            outputTokens += Math.ceil(chunk.length / 4);
            outputBytes += chunk.length;

            if (outputBytes > MAX_OUTPUT_BYTES) {
              throw new Error(`BYOM response exceeded max size of ${MAX_OUTPUT_BYTES} bytes`);
            }

            const safety = FlightControl.postFlight(chunk);
            const output = safety.redacted ? safety.modifiedContent ?? '' : chunk;
            const sseData = JSON.stringify({ choices: [{ delta: { content: output } }] });
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          const region = req.headers.get('x-region') ?? 'us';
          const estimatedCost = (inputTokens * 0.00001) + (outputTokens * 0.00003); // approximate token cost: refine per provider pricing sheet
          
          await supabase.from('omnihub_audit_log').insert({
            action: 'BYOM_AUDIT_SPAN',
            tenant_id: tenantId,
            actor_id: user.id,
            details: {
              provider_id: provider,
              model,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cost_incurred: estimatedCost,
              status: 'success',
              region
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
