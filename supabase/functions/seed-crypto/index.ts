import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCockpitCrypto } from "../_shared/cockpit-crypto.ts";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── Auth guard: caller must present a valid Supabase JWT ─────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const crypto = getCockpitCrypto();
    const { apiKey, tenantId, userId, provider } = await req.json();

    const ciphertext = await crypto.encrypt(apiKey, { tenantId });
    const fingerprint = await crypto.fingerprint(apiKey);
    const hexCiphertext = "\\x" + Array.from(ciphertext).map(b => b.toString(16).padStart(2, "0")).join("");

    await supabase.from("omnihub_model_registry").delete().match({ tenant_id: tenantId, provider_id: provider });
    const { error: regError } = await supabase.from("omnihub_model_registry").insert({
      tenant_id: tenantId,
      provider_id: provider,
      auth_secret_ref: "dummy_ref",
      is_active: true,
      provider_type: "openai-compatible",
      allowed_models: ["gpt-4o", "gpt-3.5-turbo", "llama3-8b-8192"],
      max_cost_usd: 1000,
      max_latency_ms: 30000,
      retention_mode: "persistent",
      pii_policy: "allow_internal",
      tool_use_permissions: ["action_dispatch"]
    });

    if (regError) throw regError;

    await supabase.from("provider_connections").delete().match({ user_id: userId, provider: provider });
    const { error: connError } = await supabase.from("provider_connections").insert({
      tenant_id: tenantId,
      user_id: userId,
      provider: provider,
      auth_type: "api_key",
      status: "active",
      credential_ciphertext: hexCiphertext,
      credential_fingerprint: fingerprint
    });

    if (connError) throw connError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
