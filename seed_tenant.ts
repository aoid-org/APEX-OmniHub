import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCockpitCrypto } from "./supabase/functions/_shared/cockpit-crypto.ts";

// Required environment variables:
//   SUPABASE_URL             - your project URL
//   SUPABASE_SERVICE_ROLE_KEY - your service-role JWT (YOUR_SERVICE_ROLE_KEY)
//   SEED_USER_EMAIL          - email of the user to authenticate as
//   SEED_USER_PASSWORD       - password of the user to authenticate as

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    console.error(
      `[seed_tenant] Missing required environment variable: ${name}\n` +
      `Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SEED_USER_EMAIL=... SEED_USER_PASSWORD=... deno run --allow-env --allow-net seed_tenant.ts`
    );
    Deno.exit(1);
  }
  return value;
}

async function seed() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = requireEnv("SEED_USER_EMAIL");
  const password = requireEnv("SEED_USER_PASSWORD");

  const crypto = getCockpitCrypto();

  const authClient = createClient(supabaseUrl, serviceRoleKey);

  console.warn("Authenticating user...");
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    console.error("Auth failed:", authError);
    Deno.exit(1);
  }

  const userId = authData.session.user.id;
  const tenantId = authData.session.user.user_metadata?.tenant_id ?? userId;
  console.warn(`User ID: ${userId}, Tenant ID: ${tenantId}`);

  // Create a separate admin client that DOES NOT have the user session attached
  // so it genuinely acts as service_role bypassing RLS
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.warn("Inserting registry record...");
  await adminClient.from("omnihub_model_registry").delete().match({ tenant_id: tenantId, provider_id: "groq" });

  const { error: regError } = await adminClient.from("omnihub_model_registry").insert({
    tenant_id: tenantId,
    provider_id: "groq",
    auth_secret_ref: "dummy_ref",
    is_active: true,
    provider_type: "openai-compatible",
    allowed_models: ["llama3-8b-8192"],
    max_cost_usd: 1000,
    max_latency_ms: 30000,
    retention_mode: "persistent",
    pii_policy: "allow_internal",
    tool_use_permissions: ["action_dispatch"]
  });

  if (regError) {
    console.error("Registry Insert Error:", regError);
  } else {
    console.warn("Registry seeded successfully.");
  }

  const apiKey = "mock_key_removed";
  const ciphertext = await crypto.encrypt(apiKey, { tenantId });
  const fingerprint = await crypto.fingerprint(apiKey);

  const hexCiphertext = "\\x" + Array.from(ciphertext).map(b => b.toString(16).padStart(2, "0")).join("");

  console.warn("Inserting provider connection...");
  await adminClient.from("provider_connections").delete().match({ user_id: userId, provider: "groq" });

  const { error: connError } = await adminClient.from("provider_connections").insert({
    tenant_id: tenantId,
    user_id: userId,
    provider: "groq",
    auth_type: "api_key",
    status: "active",
    credential_ciphertext: hexCiphertext,
    credential_fingerprint: fingerprint
  });

  if (connError) {
    console.error("Connection Insert Error:", connError);
  } else {
    console.warn("Connection seeded successfully.");
  }
}

seed();
