import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function testLiveProxy() {
  const supabaseUrl = "https://rtopreovkywofgwgmozi.supabase.co";
  const supabaseKey = "sb_publishable_fhOZZrH8blDisp915SKTaw_GswiPZpk";
  const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0b3ByZW92a3l3b2Znd2dtb3ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQzNDE5MCwiZXhwIjoyMDgxMDEwMTkwfQ.Lk6rjfJsenqw0QctpVlxPqjZkFOkoIwxQz1NigW7d-k";
  const email = "jrmendozaceo@apexbusiness-systems.com";
  const password = "Apex143!";

  if (!supabaseUrl || !supabaseKey || !serviceRoleKey || !email || !password) {
    console.error("Missing environment variables!");
    Deno.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  console.log("Logging in...");
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

  console.log("Sending Request 1 (Expect Cache Miss & Compression)...");
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
    console.error("Request 1 failed:", res1.status, errorText);
  } else {
    // Read the stream to completion
    const reader = res1.body?.getReader();
    const decoder = new TextDecoder();
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      Deno.stdout.writeSync(value);
    }
    console.log("\n--- Request 1 Completed ---");
  }

  console.log("Waiting 2 seconds to allow background audit log write...");
  await new Promise(r => setTimeout(r, 2000));

  console.log("Sending Request 2 (Expect Cache Hit)...");
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
    console.error("Request 2 failed:", res2.status, errorText);
  } else {
    console.log("Cache header:", res2.headers.get("X-Cache"));
    const data = await res2.text();
    console.log("Response:", data.substring(0, 200) + "...");
    console.log("\n--- Request 2 Completed ---");
  }

  console.log("Waiting 2 seconds to allow background audit log write...");
  await new Promise(r => setTimeout(r, 2000));

  console.log("Fetching Audit Logs...");
  const { data: logs, error: logsError } = await adminClient
    .from("audit_logs")
    .select("*")
    .eq("action_type", "BYOM_AUDIT_SPAN")
    .order("created_at", { ascending: false })
    .limit(2);

  if (logsError) {
    console.error("Failed to fetch logs:", logsError);
  } else {
    console.log("Audit Logs (Compression Metrics):");
    logs.forEach((log: unknown, i: number) => {
      console.log(`Log ${i}:`, JSON.stringify(log.metadata?.compression, null, 2));
      console.log(`Log Status: ${log.metadata?.status}`);
    });
  }
}

testLiveProxy();
