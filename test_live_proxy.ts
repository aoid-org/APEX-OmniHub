import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sanitizeLog = (s: unknown, maxLen = 200): string =>
  String(s).replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED]").replace(/[\r\n\t]/g, " ").substring(0, maxLen);

const requiredEnv = (name: string): string => {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    Deno.exit(1);
  }
  return value;
};

async function testLiveProxy() {
  if (Deno.env.get("APEX_ALLOW_LIVE_SUPABASE_ADMIN_SCRIPT") !== "true") {
    console.error(
      "Refusing to run: APEX_ALLOW_LIVE_SUPABASE_ADMIN_SCRIPT must be set to 'true'. " +
      "This script performs live privileged Supabase operations using the service-role key."
    );
    Deno.exit(1);
  }

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const supabaseKey = requiredEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = requiredEnv("LIVE_PROXY_EMAIL");
  const password = requiredEnv("LIVE_PROXY_PASSWORD");

  const supabase = createClient(supabaseUrl, supabaseKey);
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.warn("Logging in with configured live proxy test user...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    console.error("Login failed for configured live proxy test user.");
    Deno.exit(1);
  }

  const token = authData.session.access_token;
  const proxyUrl = `${supabaseUrl}/functions/v1/byom-proxy`;

  const payload = {
    provider: "openai",
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an APEX-OmniHub AI assistant. This is an operator-authorized live proxy smoke test.",
      },
      {
        role: "user",
        content: "What is your purpose?",
      },
    ],
  };

  console.warn("Sending Request 1 (Expect Cache Miss & Compression)...");
  const res1 = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res1.ok) {
    const errorText = await res1.text();
    console.error("Request 1 failed:", res1.status, sanitizeLog(errorText));
  } else {
    await res1.arrayBuffer();
    console.warn("Request 1 completed.");
  }

  console.warn("Waiting 2 seconds to allow background audit log write...");
  await new Promise((r) => setTimeout(r, 2000));

  console.warn("Sending Request 2 (Expect Cache Hit)...");
  const res2 = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res2.ok) {
    const errorText = await res2.text();
    console.error("Request 2 failed:", res2.status, sanitizeLog(errorText));
  } else {
    console.warn("Cache header:", sanitizeLog(res2.headers.get("X-Cache")));
    await res2.arrayBuffer();
    console.warn("Request 2 completed.");
  }

  console.warn("Waiting 2 seconds to allow background audit log write...");
  await new Promise((r) => setTimeout(r, 2000));

  console.warn("Fetching Audit Logs...");
  const { data: logs, error: logsError } = await adminClient
    .from("audit_logs")
    .select("metadata")
    .eq("action_type", "BYOM_AUDIT_SPAN")
    .order("created_at", { ascending: false })
    .limit(2);

  if (logsError) {
    console.error("Failed to fetch logs.");
  } else {
    console.warn("Audit Logs (Compression Metrics):");
    (logs as Array<{ metadata?: { compression?: unknown; status?: unknown } }>)
      .forEach((log, i) => {
        console.warn(`Log ${i} compression:`, sanitizeLog(JSON.stringify(log.metadata?.compression ?? null)));
        console.warn(`Log ${i} status:`, sanitizeLog(log.metadata?.status));
      });
  }
}

testLiveProxy();
