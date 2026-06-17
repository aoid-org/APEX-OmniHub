import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCockpitCrypto } from "./supabase/functions/_shared/cockpit-crypto.ts";

const requiredEnv = (name: string): string => {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    Deno.exit(1);
  }
  return value;
};

async function seed() {
  if (Deno.env.get("APEX_ALLOW_LIVE_SUPABASE_ADMIN_SCRIPT") !== "true") {
    console.error(
      "Refusing to run: APEX_ALLOW_LIVE_SUPABASE_ADMIN_SCRIPT must be set to 'true'. " +
      "This script performs live privileged Supabase operations using the service-role key."
    );
    Deno.exit(1);
  }

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = requiredEnv("SEED_TENANT_EMAIL");
  const password = requiredEnv("SEED_TENANT_PASSWORD");
  const providerApiKey = requiredEnv("SEED_TENANT_PROVIDER_API_KEY");

  const crypto = getCockpitCrypto();
  const authClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.warn("Authenticating configured seed user...");
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    console.error("Auth failed for configured seed user.");
    Deno.exit(1);
  }

  const userId = authData.session.user.id;
  const tenantId = authData.session.user.user_metadata?.tenant_id ?? userId;
  console.warn(`Resolved seed tenant for user ${userId}.`);

  // Create a separate admin client that DOES NOT have the user session attached
  // so it genuinely acts as service_role bypassing RLS.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.warn("Inserting registry record...");
  await adminClient.from("omnihub_model_registry").delete().match({ tenant_id: tenantId, provider_id: "groq" });

  const { error: regError } = await adminClient.from("omnihub_model_registry").insert({
    tenant_id: tenantId,
    provider_id: "groq",
    auth_secret_ref: "env_seeded_provider_key",
    is_active: true,
    provider_type: "openai-compatible",
    allowed_models: ["llama3-8b-8192"],
    max_cost_usd: 1000,
    max_latency_ms: 30000,
    retention_mode: "persistent",
    pii_policy: "allow_internal",
    tool_use_permissions: ["action_dispatch"],
  });

  if (regError) {
    console.error("Registry insert failed.");
  } else {
    console.warn("Registry seeded successfully.");
  }

  const ciphertext = await crypto.encrypt(providerApiKey, { tenantId });
  const fingerprint = await crypto.fingerprint(providerApiKey);

  const hexCiphertext = "\\x" + Array.from(ciphertext).map((b) => b.toString(16).padStart(2, "0")).join("");

  console.warn("Inserting provider connection...");
  await adminClient.from("provider_connections").delete().match({ user_id: userId, provider: "groq" });

  const { error: connError } = await adminClient.from("provider_connections").insert({
    tenant_id: tenantId,
    user_id: userId,
    provider: "groq",
    auth_type: "api_key",
    status: "active",
    credential_ciphertext: hexCiphertext,
    credential_fingerprint: fingerprint,
  });

  if (connError) {
    console.error("Connection insert failed.");
  } else {
    console.warn("Connection seeded successfully.");
  }
}

seed();
