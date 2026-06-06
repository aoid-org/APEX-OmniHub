import { z } from "https://esm.sh/zod@3.25.76";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCockpitCrypto } from "../_shared/cockpit-crypto.ts";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitExceededResponse } from "../_shared/rate-limit.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? '';
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';

// We need service_role to create users and bypass RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const cockpitCrypto = getCockpitCrypto();

const PROVIDERS = ['openai', 'google', 'anthropic', 'xai', 'groq'] as const;
type ByomProvider = typeof PROVIDERS[number];

const LoginSchema = z.object({
  provider: z.enum(PROVIDERS),
  api_key: z.string().min(10).max(500),
});

const API_KEY_PATTERNS: Record<ByomProvider, RegExp> = {
  openai: /^sk-[A-Za-z0-9_-]{20,}$/,
  anthropic: /^sk-ant-[A-Za-z0-9_-]{20,}$/,
  google: /^AI[A-Za-z0-9_-]{20,}$/,
  xai: /^xai-[A-Za-z0-9_-]{20,}$/,
  groq: /^gsk_[A-Za-z0-9_-]{20,}$/,
};

const PROVIDER_PROBE_ENDPOINTS: Record<ByomProvider, string> = {
  openai: "https://api.openai.com/v1/models?limit=1",
  anthropic: "https://api.anthropic.com/v1/models?limit=1",
  google: "https://generativelanguage.googleapis.com/v1beta/models",
  xai: "https://api.x.ai/v1/models",
  groq: "https://api.groq.com/openai/v1/models",
};

async function probeCredential(
  provider: ByomProvider,
  apiKey: string
): Promise<{ valid: boolean; reason?: string }> {
  const probeUrl = PROVIDER_PROBE_ENDPOINTS[provider];
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  switch (provider) {
    case "openai":
    case "xai":
    case "groq":
      headers["Authorization"] = `Bearer ${apiKey}`;
      break;
    case "anthropic":
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      break;
    case "google":
      headers["x-goog-api-key"] = apiKey;
      break;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(probeUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) return { valid: true };
    if (response.status === 401 || response.status === 403) {
      return { valid: false, reason: "Provider rejected credential (unauthorized)" };
    }
    if (response.status === 429) return { valid: true }; // Rate limited = key IS valid

    return { valid: false, reason: `Provider returned HTTP ${response.status}` };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { valid: false, reason: "Credential probe timed out (10s)" };
    }
    return { valid: false, reason: "Unable to reach provider API" };
  }
}

function jsonResponse(data: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...buildCorsHeaders(origin),
      'Content-Type': 'application/json',
    },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handlePreflight(req);
  }

  const origin = req.headers.get('origin');
  
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin);
  }

  try {
    // Basic IP rate limit for the login endpoint
    const clientIp = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown_ip";
    const rl = await checkRateLimit(clientIp, { maxRequests: 10, windowMs: 60_000, keyPrefix: 'byom-login' });
    if (!rl.allowed) {
      return rateLimitExceededResponse(origin, rl);
    }

    const body = LoginSchema.parse(await req.json());
    const { provider, api_key } = body;

    const pattern = API_KEY_PATTERNS[provider];
    if (pattern && !pattern.test(api_key)) {
      return jsonResponse({ error: `Invalid API key format for ${provider}` }, 400, origin);
    }

    // 1. Probe the credential to ensure it's valid
    const probeResult = await probeCredential(provider, api_key);
    if (!probeResult.valid) {
      return jsonResponse({ error: "Invalid credential", details: probeResult.reason }, 401, origin);
    }

    // 2. Generate deterministic fingerprint
    const fingerprint = await cockpitCrypto.fingerprint(api_key);
    const email = `${fingerprint}@byom.local`;
    // We use a fixed derivative of the fingerprint as the password, keeping it deterministic but unknown to outside
    const password = await cockpitCrypto.fingerprint(fingerprint + "byom_password_salt"); 

    // 3. Lookup or Create User
    let userId: string;
    let tenantId: string;
    
    // Attempt sign in first
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    let session = signInData?.session;

    if (signInError || !session) {
      // User likely does not exist. Create them.
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          identity_type: 'byom',
          fingerprint,
        }
      });

      if (signUpError || !signUpData.user) {
        throw new Error(`User creation failed: ${signUpError?.message}`);
      }

      userId = signUpData.user.id;
      tenantId = userId; // Tenant ID is User ID for pure BYOM sovereign

      // After creation, sign in to get the session
      const { data: secondSignInData, error: secondSignInError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (secondSignInError || !secondSignInData.session) {
        throw new Error(`Failed to establish session after creation: ${secondSignInError?.message}`);
      }
      session = secondSignInData.session;
    } else {
      userId = signInData.user.id;
      tenantId = signInData.user.user_metadata?.tenant_id ?? userId;
    }

    // 4. Encrypt credential for the vault
    const hint = cockpitCrypto.extractHint(api_key, 4);
    const ciphertext = await cockpitCrypto.encrypt(api_key, { tenantId });

    // 5. Store/Update connection in provider_connections
    // We do an upsert or delete-insert because they might be reconnecting
    await supabaseAdmin
      .from('provider_connections')
      .update({ status: 'revoked' })
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('status', 'active');

    const { error: insertError } = await supabaseAdmin
      .from("provider_connections")
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        provider,
        auth_type: 'api_key',
        credential_ciphertext: Array.from(ciphertext),
        credential_fingerprint: fingerprint,
        key_hint: hint,
        status: "active",
      });

    if (insertError) {
      throw new Error(`Failed to store connection: ${insertError.message}`);
    }

    // 6. Provision model registry for the user (self-service sovereign policy)
    // We give them unlimited budget and max retention because they are paying for it themselves
    const { error: registryError } = await supabaseAdmin
      .from('omnihub_model_registry')
      .upsert({
        tenant_id: tenantId,
        provider_id: provider,
        endpoint: PROVIDER_PROBE_ENDPOINTS[provider].replace('/models?limit=1', '/chat/completions').replace('/models', '/chat/completions'),
        provider_type: provider === 'anthropic' ? 'anthropic-compatible' : 'openai-compatible',
        auth_secret_ref: 'none',
        is_active: true,
        allowed_models: ['*'],
        max_cost_usd: 999999,
        retention_mode: 'ephemeral',
        pii_policy: 'passthrough',
        tool_use_permissions: ['allowed']
      }, { onConflict: 'tenant_id,provider_id' });

    if (registryError) {
        console.warn(`[byom-login] registry insert warning (may exist): ${registryError.message}`);
    }

    // 7. Audit Log (No Secrets)
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: userId,
      tenant_id: tenantId,
      action_type: "byom.login",
      resource_type: "auth",
      metadata: { provider, fingerprint },
    });

    // 8. Return Session to client
    return jsonResponse({
      status: "success",
      session, // The client will use supabase.auth.setSession(session)
    }, 200, origin);

  } catch (error) {
    console.error("[byom-login] Error:", error);
    if (error instanceof z.ZodError) {
      return jsonResponse({ error: "Validation failed", details: error.errors }, 400, origin);
    }
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500, origin);
  }
});
