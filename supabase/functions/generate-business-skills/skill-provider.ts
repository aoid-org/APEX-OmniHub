/**
 * Skill Forge — provider selection + SkillDefinition validation.
 *
 * Runtime-agnostic (no Deno globals, no network): env is injected as a plain
 * object so this module is unit-testable under vitest/Node while resolving the
 * bare `zod` specifier via the Supabase import map in the Deno edge runtime.
 *
 * Generation compute is routed through `_shared/llm.ts` (callLLMJson), whose
 * policy permits Groq + Anthropic ONLY. Groq is preferred for cheaper skill
 * generation when GROQ_API_KEY is present.
 */

import { z } from "zod";

export type SkillProvider = "groq" | "anthropic";

export interface SkillProviderEnv {
  readonly SKILL_FORGE_PROVIDER?: string;
  readonly GROQ_API_KEY?: string;
  readonly ANTHROPIC_API_KEY?: string;
  readonly SKILL_FORGE_GROQ_MODEL?: string;
  readonly SKILL_FORGE_ANTHROPIC_MODEL?: string;
}

export type ProviderResolution =
  | { readonly ok: true; readonly provider: SkillProvider; readonly model?: string }
  | { readonly ok: false; readonly error: string };

/**
 * Resolve the skill-generation provider from environment.
 *
 * - Explicit SKILL_FORGE_PROVIDER=groq|anthropic is honoured, but only if the
 *   matching API key exists (otherwise a safe config error is returned).
 * - With no explicit selection, Groq is preferred (cheaper) when GROQ_API_KEY
 *   exists, else Anthropic when ANTHROPIC_API_KEY exists.
 * - If neither key exists, a config error is returned (never a fabricated key).
 *
 * The model is left undefined unless an explicit per-tier override env is set,
 * so `_shared/llm.ts` applies its own verified default
 * (GROQ_DEFAULT_MODEL / ANTHROPIC_DEFAULT_MODEL). No model name is invented here.
 */
export function resolveSkillProvider(env: SkillProviderEnv): ProviderResolution {
  const explicit = env.SKILL_FORGE_PROVIDER?.toLowerCase().trim();
  const hasGroq = typeof env.GROQ_API_KEY === "string" && env.GROQ_API_KEY.length > 0;
  const hasAnthropic =
    typeof env.ANTHROPIC_API_KEY === "string" && env.ANTHROPIC_API_KEY.length > 0;

  const groqModel = normalizeModel(env.SKILL_FORGE_GROQ_MODEL);
  const anthropicModel = normalizeModel(env.SKILL_FORGE_ANTHROPIC_MODEL);

  if (explicit === "groq") {
    if (!hasGroq) {
      return { ok: false, error: "SKILL_FORGE_PROVIDER=groq but GROQ_API_KEY is not configured" };
    }
    return { ok: true, provider: "groq", model: groqModel };
  }

  if (explicit === "anthropic") {
    if (!hasAnthropic) {
      return {
        ok: false,
        error: "SKILL_FORGE_PROVIDER=anthropic but ANTHROPIC_API_KEY is not configured",
      };
    }
    return { ok: true, provider: "anthropic", model: anthropicModel };
  }

  if (explicit !== undefined && explicit.length > 0) {
    return {
      ok: false,
      error: `SKILL_FORGE_PROVIDER='${explicit}' is not allowed; use 'groq' or 'anthropic'`,
    };
  }

  // No explicit provider: prefer Groq (cheaper) when its key exists.
  if (hasGroq) {
    return { ok: true, provider: "groq", model: groqModel };
  }
  if (hasAnthropic) {
    return { ok: true, provider: "anthropic", model: anthropicModel };
  }

  return {
    ok: false,
    error: "No skill-generation provider configured: set GROQ_API_KEY or ANTHROPIC_API_KEY",
  };
}

function normalizeModel(raw: string | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * SkillDefinition schema. Matches the documented `definition` JSONB shape and
 * the edge function's persisted contract: {name, description, instructions[], required_apis[]}.
 */
export const skillDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  instructions: z.array(z.string().min(1)).min(3),
  required_apis: z.array(z.string()).default([]),
});

export type SkillDefinition = z.infer<typeof skillDefinitionSchema>;

export type SkillParseResult =
  | { readonly ok: true; readonly skill: SkillDefinition }
  | { readonly ok: false; readonly error: string };

/**
 * Strip a single ```json ... ``` (or ``` ... ```) code fence if present.
 * Models occasionally wrap JSON despite instructions not to.
 */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fence ? fence[1].trim() : trimmed;
}

/**
 * Validate an LLM-produced SkillDefinition. Accepts either a parsed object
 * (callLLMJson already JSON-parses) or a raw string. Returns a discriminated
 * result so the caller maps failure to 422 WITHOUT inserting a fake skill.
 */
export function parseSkillDefinition(raw: unknown): SkillParseResult {
  let candidate: unknown = raw;

  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(stripCodeFences(raw));
    } catch {
      return { ok: false, error: "LLM response was not valid JSON" };
    }
  }

  const parsed = skillDefinitionSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, error: "LLM response did not match the SkillDefinition schema" };
  }

  return { ok: true, skill: parsed.data };
}

/**
 * System prompt for skill generation. Requests EXACTLY the validated schema
 * shape so parseSkillDefinition() succeeds on well-formed model output.
 */
export const SKILL_FORGE_SYSTEM_PROMPT =
  "You are APEX Skill Forge. Convert the user's intent, trigger and constraints " +
  "into a single business-automation skill. Respond with ONLY a JSON object " +
  "(no prose, no markdown) with exactly these fields: " +
  '"name" (string), "description" (string), ' +
  '"instructions" (array of at least 3 concise imperative strings), ' +
  '"required_apis" (array of strings, may be empty).';
