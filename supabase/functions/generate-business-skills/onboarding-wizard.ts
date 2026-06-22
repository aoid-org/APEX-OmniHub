/**
 * OnboardingWizard flow (legacy, public, rate-limited) for the
 * generate-business-skills function. Extracted from index.ts to keep each
 * module single-responsibility and within the module-size policy.
 */

import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from "../_shared/rate-limit.ts";
import { json, type RequestBody, type CorsHeaders } from "./http-helpers.ts";

function clientIdentifier(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Handle OnboardingWizard flow (description/goal) */
export async function handleOnboardingWizard(
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
          "You are a business systems architect. Based on the user's business description and primary objective, generate a JSON array of 3 'skills' (automated workflows/agents). The first should be tier 'CORE' (basic operational necessity). The second and third should be tier 'GROWTH_ENGINE' (advanced, revenue-generating). Each skill needs: id (uuid), name, description, and tier ('CORE' or 'GROWTH_ENGINE'). Output ONLY valid JSON containing an object with a 'skills' array, no markdown.",
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
