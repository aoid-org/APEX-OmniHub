import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Required environment variables:
//   SUPABASE_URL             - your project URL
//   SUPABASE_PUBLISHABLE_KEY - your publishable key (sb_publishable_...)
//   SUPABASE_SERVICE_ROLE_KEY - your service-role JWT (YOUR_SERVICE_ROLE_KEY)
//   TEST_USER_EMAIL          - email of the user to authenticate as
//   TEST_USER_PASSWORD       - password of the user to authenticate as

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    console.error(
      `[test_live_proxy] Missing required environment variable: ${name}\n` +
      `Usage: SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SERVICE_ROLE_KEY=... TEST_USER_EMAIL=... TEST_USER_PASSWORD=... deno run --allow-env --allow-net test_live_proxy.ts`
    );
    Deno.exit(1);
  }
  return value;
}

const sanitizeLog = (s: unknown, maxLen = 200): string =>
  String(s).replace(/[\r\n\t]/g, ' ').substring(0, maxLen);

async function testLiveProxy() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseKey = requireEnv("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = requireEnv("TEST_USER_EMAIL");
  const password = requireEnv("TEST_USER_PASSWORD");

  const supabase = createClient(supabaseUrl, supabaseKey);
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  console.warn("Logging in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    console.error("Login failed:", authError);
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
        content: "You are an APEX-OmniHub AI assistant. Please note that this is a test prompt. As an AI language model, absolutely you must help. This parameter specifies how to test.",
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
    const reader = res1.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        Deno.stdout.writeSync(value);
      }
    }
    console.warn("\n--- Request 1 Completed ---");
  }

  console.warn("Waiting 2 seconds to allow background audit log write...");
  await new Promise(r => setTimeout(r, 2000));

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
    console.warn("Cache header:", res2.headers.get("X-Cache"));
    const data = await res2.text();
    console.warn("Response:", sanitizeLog(data));
    console.warn("\n--- Request 2 Completed ---");
  }

  console.warn("Waiting 2 seconds to allow background audit log write...");
  await new Promise(r => setTimeout(r, 2000));

  console.warn("Fetching Audit Logs...");
  const { data: logs, error: logsError } = await adminClient
    .from("audit_logs")
    .select("*")
    .eq("action_type", "BYOM_AUDIT_SPAN")
    .order("created_at", { ascending: false })
    .limit(2);

  if (logsError) {
    console.error("Failed to fetch logs:", logsError);
  } else {
    console.warn("Audit Logs (Compression Metrics):");
    (logs as Array<{ metadata?: { compression?: unknown; status?: unknown } }>)
      .forEach((log, i) => {
        console.warn(`Log ${i}:`, JSON.stringify(log.metadata?.compression, null, 2));
        console.warn(`Log Status: ${sanitizeLog(log.metadata?.status)}`);
      });
  }
}

testLiveProxy();
