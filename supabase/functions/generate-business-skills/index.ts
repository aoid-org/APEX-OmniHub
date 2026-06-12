import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildCorsHeaders,
  handlePreflight,
  corsErrorResponse,
  isOriginAllowed,
} from "../_shared/cors.ts";
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from "../_shared/rate-limit.ts";

interface RequestBody {
  intent?: string;
  trigger?: string;
  constraints?: string;
  // Legacy support for OnboardingWizard
  description?: string;
  goal?: string;
}

interface SkillDefinition {
  name: string;
  description: string;
  instructions: string[];
  required_apis: string[];
}

interface UserRecord {
  id: string;
}

type CorsHeaders = Record<string, string>;

const MAX_BODY_SIZE_BYTES = 16 * 1024;

function json(
  data: unknown,
  status: number,
  corsHeaders: CorsHeaders
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clientIdentifier(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function readJsonBody(req: Request): Promise<RequestBody | Response> {
  const contentLength = Number.parseInt(
    req.headers.get("content-length") || "0",
    10
  );
  if (contentLength > MAX_BODY_SIZE_BYTES) {
    return new Response(JSON.stringify({ error: "PAYLOAD_TOO_LARGE" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  if (!rawBody) {
    return new Response(
      JSON.stringify({
        error: "BAD_REQUEST",
        message: "Request body is required",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (new TextEncoder().encode(rawBody).length > MAX_BODY_SIZE_BYTES) {
    return new Response(JSON.stringify({ error: "PAYLOAD_TOO_LARGE" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    return JSON.parse(rawBody) as RequestBody;
  } catch {
    return new Response(
      JSON.stringify({
        error: "BAD_REQUEST",
        message: "Request body must be valid JSON",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}

/** Authenticate the request and return the Supabase client + user */
async function authenticateRequest(
  req: Request,
  origin: string | null
): Promise<{ client: SupabaseClient; user: UserRecord } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return corsErrorResponse(
      "UNAUTHORIZED",
      "Missing authorization header",
      401,
      origin
    );
  }

  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return corsErrorResponse(
      "UNAUTHORIZED",
      "Invalid authentication token",
      401,
      origin
    );
  }

  return { client, user };
}

/** Handle Skill Forge flow (intent/trigger/constraints) */
async function handleSkillForge(
  body: RequestBody,
  client: SupabaseClient,
  user: UserRecord,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const { intent, trigger, constraints } = body;

  if (!intent || !trigger || !constraints) {
    return new Response(
      JSON.stringify({
        error: "MISSING_FIELDS",
        message: "Intent, trigger, and constraints are required",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Entitlement Gate (The Monetization Throttle)
  const { data: entitlement, error: entitlementError } = await client.rpc(
    "check_skill_entitlement",
    { user_uuid: user.id }
  );

  if (entitlementError) {
    console.error("Entitlement check failed:", entitlementError);
    return new Response(
      JSON.stringify({
        error: "ENTITLEMENT_CHECK_FAILED",
        message: "Could not verify skill limits",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Enforce 3-skill limit (The Pilot Trap)
  if (!entitlement.allowed) {
    return new Response(
      JSON.stringify({
        error: "LIMIT_REACHED",
        message:
          "SYSTEM OVERLOAD — Upgrade to Architect Tier to forge more skills.",
        context: {
          current: entitlement.current,
          max: entitlement.max,
          tier: entitlement.tier,
        },
      }),
      {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Generate Skill via Anthropic (name overwritten below for uniqueness)
  const skillName = `skill_${crypto.randomUUID()}`;

  let generatedSkill: SkillDefinition;

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY missing");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1024,
        system:
          "Output a valid SkillDefinition JSON with fields: id, name, intent, trigger, constraints (array), instructions (array min 3 items). Do not wrap in markdown or include extra text.",
        messages: [
          {
            role: "user",
            content: JSON.stringify({ intent, trigger, constraints }),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error:", response.status);
      throw new Error("Anthropic API failed");
    }

    const data = await response.json();
    const resultText = data.content[0].text;

    generatedSkill = JSON.parse(resultText);
    generatedSkill.name = skillName; // ensure unique name
  } catch (error) {
    console.error("Failed to generate skill with Anthropic:", error);
    return new Response(
      JSON.stringify({
        error: "UNPROCESSABLE_ENTITY",
        message: "Failed to generate skill JSON",
      }),
      {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Persist to Database
  const { error: insertError } = await client
    .from("user_generated_skills")
    .insert({
      user_id: user.id,
      name: skillName,
      trigger_intent: trigger,
      definition: generatedSkill,
    });

  if (insertError) {
    // DB-level entitlement trigger fired (closes the check-then-insert race):
    // return the same 402 contract as the entitlement gate above.
    if (insertError.message?.includes("LIMIT_REACHED")) {
      return new Response(
        JSON.stringify({
          error: "LIMIT_REACHED",
          message:
            "SYSTEM OVERLOAD — Upgrade to Architect Tier to forge more skills.",
          context: {
            current: entitlement.current,
            max: entitlement.max,
            tier: entitlement.tier,
          },
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.error("Failed to insert skill:", insertError);
    return new Response(
      JSON.stringify({
        error: "DATABASE_ERROR",
        message: "Failed to save skill",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      skill: generatedSkill,
      entitlement: {
        used: entitlement.current + 1,
        max: entitlement.max,
        tier: entitlement.tier,
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/** Handle OnboardingWizard flow (description/goal) */
async function handleOnboardingWizard(
  body: RequestBody,
  req: Request,
  origin: string | null,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const goal = typeof body.goal === "string" ? body.goal.trim() : "";

  if (description.length < 20 || description.length > 2000) {
    return json(
      {
        error: "BAD_REQUEST",
        message: "Description must be between 20 and 2,000 characters",
      },
      400,
      corsHeaders
    );
  }

  if (goal.length < 5 || goal.length > 500) {
    return json(
      {
        error: "BAD_REQUEST",
        message: "Goal must be between 5 and 500 characters",
      },
      400,
      corsHeaders
    );
  }

  const rateLimit = await checkRateLimit(
    clientIdentifier(req),
    RATE_LIMIT_CONFIGS.publicOnboardingGenerate
  );
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(origin, rateLimit);
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return json(
        {
          error: "GENERATION_UNAVAILABLE",
          message: "Generation is temporarily unavailable",
        },
        503,
        corsHeaders
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1500,
        system:
          "You are a business systems architect. Based on the user's business description and primary objective, generate a JSON array of 3 'skills' (automated workflows/agents). The first should be tier 'CORE' (basic operational necessity). The second and third should be tier 'GROWTH_ENGINE' (advanced, revenue-generating). Each skill needs: id (uuid), name, description, projected_monthly_revenue (string), confidence_score (number 0-100), and tier ('CORE' or 'GROWTH_ENGINE'). Output ONLY valid JSON containing an object with a 'skills' array, no markdown.",
        messages: [
          {
            role: "user",
            content: `Description: ${description}\nGoal: ${goal}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error:", response.status);
      throw new Error("Anthropic API failed");
    }

    const data = await response.json();
    const resultText = data.content[0].text;
    const generatedData = JSON.parse(resultText);

    return new Response(JSON.stringify(generatedData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to generate business skills:", error);
    return new Response(
      JSON.stringify({
        error: "GENERATION_FAILED",
        message: "Failed to generate operational architecture",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handlePreflight(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method !== "POST") {
    return json(
      { error: "METHOD_NOT_ALLOWED", message: "Only POST is allowed" },
      405,
      corsHeaders
    );
  }

  if (!isOriginAllowed(origin)) {
    return corsErrorResponse(
      "ORIGIN_NOT_ALLOWED",
      "CORS policy: Origin not allowed",
      403,
      origin
    );
  }

  try {
    const parsedBody = await readJsonBody(req);
    if (parsedBody instanceof Response) {
      const bodyText = await parsedBody.text();
      return new Response(bodyText, {
        status: parsedBody.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = parsedBody;

    // Handle public OnboardingWizard requests
    if (body.description !== undefined && body.goal !== undefined) {
      return await handleOnboardingWizard(body, req, origin, corsHeaders);
    }

    // Handle authenticated Skill Forge requests
    const authResult = await authenticateRequest(req, origin);
    if (authResult instanceof Response) return authResult;

    const { client, user } = authResult;

    if (body.intent !== undefined) {
      return await handleSkillForge(body, client, user, corsHeaders);
    }

    return new Response(
      JSON.stringify({
        error: "BAD_REQUEST",
        message: "Invalid request payload format",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_SERVER_ERROR",
        message: "Request processing failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
