/**
 * Guardian Gate - Edge-first validation and moderation for OmniLink requests
 *
 * This module provides cheap, fast validation before expensive orchestrator calls.
 * Designed to prevent malicious input, spam, and nonsensical requests.
 */

interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Main guardian check - validates query content before orchestrator handoff.
 *
 * @param query - The user's query string
 * @param _authHeader - Auth header (reserved for future per-user rate limits)
 */
export async function checkRequest(
  query: string,
  _authHeader: string,
): Promise<ValidationResult> {
  try {
    // 1. Size limits (fast)
    if (!isValidQuerySize(query)) {
      return { allowed: false, reason: "invalid_request" };
    }

    // 2. Moderation check (cheap API call)
    const moderationResult = await checkModeration(query);
    if (!moderationResult.allowed) {
      return { allowed: false, reason: "moderation_flagged" };
    }

    // 3. Intent sanity check (optional, low-cost LLM call)
    if (shouldCheckIntent()) {
      const intentResult = await checkIntentSanity(query);
      if (!intentResult.allowed) {
        return { allowed: false, reason: "failed_intent_check" };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("Guardian check failed:", error instanceof Error ? error.message : error);
    // Fail-safe: allow on error to avoid blocking legitimate requests
    return { allowed: true };
  }
}

/**
 * Validate query size limits
 */
function isValidQuerySize(query: string): boolean {
  const MAX_QUERY_LENGTH = 2000;
  return query.length <= MAX_QUERY_LENGTH;
}

/**
 * Check content against OpenAI moderation API
 */
async function checkModeration(content: string): Promise<ValidationResult> {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.warn("OPENAI_API_KEY not set, skipping moderation");
      return { allowed: true };
    }

    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: content,
      }),
    });

    if (!response.ok) {
      console.warn("Moderation API failed, allowing request");
      return { allowed: true };
    }

    const result = await response.json();
    const flagged = result.results?.[0]?.flagged ?? false;

    return { allowed: !flagged };
  } catch (error) {
    console.error("Moderation check error:", error instanceof Error ? error.message : error);
    // Fail-safe: allow on error
    return { allowed: true };
  }
}

/**
 * Optional intent sanity check using cheap LLM
 */
async function checkIntentSanity(query: string): Promise<ValidationResult> {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return { allowed: true };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a validator. Respond with only 'VALID' or 'INVALID'. " +
              "Check if this appears to be a coherent request that an AI assistant could help with.",
          },
          {
            role: "user",
            content: query.substring(0, 500),
          },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      return { allowed: true };
    }

    const result = await response.json();
    const responseText = result.choices?.[0]?.message?.content?.trim().toUpperCase();

    return { allowed: responseText === "VALID" };
  } catch (error) {
    console.error("Intent check error:", error instanceof Error ? error.message : error);
    return { allowed: true };
  }
}

/**
 * Determine if intent check should run (configurable)
 */
function shouldCheckIntent(): boolean {
  return Deno.env.get("GUARDIAN_INTENT_CHECK_ENABLED") === "true";
}
