import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("OmniLink Retry Scheduler initialized");

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // ── Service-role auth: hard-fail if caller is not authorized ──
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const cronSecret = Deno.env.get("OMNILINK_CRON_SECRET");

    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
    const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isServiceRole && !isCronAuth) {
      console.error("Retry scheduler: Unauthorized request rejected");
      return new Response(JSON.stringify({ error: "Forbidden: service-role or cron secret required" }), {
        headers: { "Content-Type": "application/json" },
        status: 403,
      });
    }

    console.log("Starting scheduled retry of failed OmniLink deliveries...");

    const retryWebhookUrl = Deno.env.get("OMNILINK_RETRY_WEBHOOK_URL");

    if (retryWebhookUrl) {
      console.log(`Invoking retry webhook at: ${retryWebhookUrl}`);

      const response = await fetch(retryWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("OMNILINK_RETRY_API_KEY") || ""}`
        },
        body: JSON.stringify({
          source: "omnilink-retry-scheduler",
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log("Retry webhook result:", result);

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      console.log("OMNILINK_RETRY_WEBHOOK_URL not configured. Logging intent only.");

      return new Response(JSON.stringify({
        message: "Scheduler ran successfully (no webhook configured)",
        timestamp: new Date().toISOString()
      }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error) {
    console.error("Retry scheduler failed:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
