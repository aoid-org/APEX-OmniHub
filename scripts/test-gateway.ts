import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

// Load .env explicitly
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.E2E_USER_EMAIL;
const TEST_PASSWORD = process.env.PASSWORD;

async function testGateway() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_EMAIL || !TEST_PASSWORD) {
    console.error("Missing credentials in .env. Required: SUPABASE_URL, SUPABASE_ANON_KEY, and TEST_USER_EMAIL/PASSWORD.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("Logging into Supabase to get a valid JWT...");
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authError || !authData.session) {
    console.error("Failed to authenticate test user:", authError?.message);
    process.exit(1);
  }

  const token = authData.session.access_token;
  console.log("Authenticated. JWT acquired.");

  // Test the apex-agent function deployed on Supabase edge
  const edgeUrl = `${SUPABASE_URL}/functions/v1/apex-agent`;
  
  const payload = {
    messages: [
      { role: "user", content: "Hello! This is an automated OmniPort Gateway smoke test. Reply strictly with: OMNIPORT_GATEWAY_ONLINE" }
    ],
    mcp_tools_enabled: false,
    system_prompt: "You are the APEX-OmniHub AI. Respond strictly according to user instructions."
  };

  console.log(`Sending POST request to ${edgeUrl}...`);
  try {
    const response = await fetch(edgeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    console.log("Response status:", response.status, response.statusText);
    
    if (response.ok) {
      if (response.headers.get("content-type")?.includes("text/event-stream")) {
         console.log("Received SSE Stream! Reading chunks...");
         const reader = response.body?.getReader();
         const decoder = new TextDecoder("utf-8");
         let fullText = "";
         if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              fullText += chunk;
            }
         }
         console.log("\n--- STREAM OUTPUT ---");
         console.log(fullText.substring(0, 500) + (fullText.length > 500 ? "..." : ""));
         console.log("---------------------\n");
         if (fullText.includes("OMNIPORT_GATEWAY_ONLINE")) {
           console.log("✅ SUCCESS: Agent successfully replied through the OmniPort edge function!");
         } else {
           console.log("⚠️ WARNING: Agent responded, but output did not match expected test string.");
         }
      } else {
         const text = await response.text();
         console.log("Response Body (Not SSE):", text);
      }
    } else {
      console.error("❌ FAILED: Gateway returned error:", await response.text());
      process.exit(1);
    }

  } catch (err) {
    console.error("❌ FAILED: Fetch exception:", err);
    process.exit(1);
  }
}

testGateway();
