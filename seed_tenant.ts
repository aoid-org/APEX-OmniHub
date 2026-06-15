import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCockpitCrypto } from "./supabase/functions/_shared/cockpit-crypto.ts";

async function seed() {
  const supabaseUrl = "https://rtopreovkywofgwgmozi.supabase.co";
  const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0b3ByZW92a3l3b2Znd2dtb3ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQzNDE5MCwiZXhwIjoyMDgxMDEwMTkwfQ.Lk6rjfJsenqw0QctpVlxPqjZkFOkoIwxQz1NigW7d-k";
  
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey);
  const crypto = getCockpitCrypto();

  const authClient = createClient(supabaseUrl, serviceRoleKey);
  
  console.warn("Authenticating user...");
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: "jrmendozaceo@apexbusiness-systems.com",
    password: "Apex143!",
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

  const apiKey = "gsk_DUMMY_KEY_REMOVED";
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
