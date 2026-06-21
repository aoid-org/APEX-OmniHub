/**
 * Shared LLM Utility Module for OmniLink APEX
 * @version 2.0.0
 *
 * Provider policy: Groq + Anthropic ONLY.
 * OpenAI REMOVED. No OPENAI_API_KEY. No api.openai.com. No GPT defaults.
 *
 * Groq uses OpenAI-compatible wire format ONLY via https://api.groq.com/openai/v1
 * Anthropic uses native API at https://api.anthropic.com/v1/messages
 *
 * Exported function names preserved for backward compatibility:
 *   callLLM, callLLMJson, classifyYesNo, extractStructured
 */

// ── Provider Types ────────────────────────────────────────────────────────────

export type AllowedProvider = "groq" | "anthropic";

// ── Message Types ─────────────────────────────────────────────────────────────

/**
 * A multimodal content block (Anthropic-native shape). `content` on an
 * {@link LLMMessage} may be a plain string (text-only, all providers) or an
 * ordered array of these blocks for vision-capable models.
 */
export type LLMContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    };

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | LLMContentBlock[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

/**
 * Collapse a message's content to plain text, whether it is a string or a
 * block array. Image bytes are dropped (never represented in the text view).
 */
export function llmTextOf(content: string | LLMContentBlock[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResponse {
  content: string;
  tool_calls?: ToolCall[];
  finish_reason: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMOptions {
  /** Provider to use. Defaults to DEFAULT_LLM_PROVIDER env var, fallback: 'anthropic' */
  provider?: AllowedProvider;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  json_mode?: boolean;
  tools?: ToolDefinition[];
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
  timeout_ms?: number;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_TOKENS = 4_096;

function getDefaultProvider(): AllowedProvider {
  const raw = Deno.env.get("DEFAULT_LLM_PROVIDER");
  if (raw === "groq" || raw === "anthropic") return raw;
  return "anthropic";
}

// ── Main callLLM ──────────────────────────────────────────────────────────────

/**
 * Make a completion request to Groq or Anthropic.
 * Throws a typed error if provider is not allowed.
 */
export async function callLLM(
  messages: LLMMessage[],
  options: LLMOptions = {},
): Promise<LLMResponse> {
  const provider: AllowedProvider = options.provider ?? getDefaultProvider();

  if (provider !== "groq" && provider !== "anthropic") {
    throw new Error(
      `[LLM] Provider '${provider}' is not allowed by APEX policy. Only 'groq' and 'anthropic' are permitted.`,
    );
  }

  if (provider === "groq") {
    return callGroq(messages, options);
  }
  return callAnthropic(messages, options);
}

// ── Groq (OpenAI-compatible wire format via api.groq.com) ────────────────────

async function callGroq(
  messages: LLMMessage[],
  options: LLMOptions,
): Promise<LLMResponse> {
  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  if (!groqApiKey) throw new Error("[LLM] GROQ_API_KEY not configured");

  const groqBaseUrl =
    Deno.env.get("GROQ_BASE_URL") ?? "https://api.groq.com/openai/v1";
  const defaultModel =
    Deno.env.get("GROQ_DEFAULT_MODEL") ?? "llama-3.1-8b-instant";

  const {
    model = defaultModel,
    temperature = 0.2,
    max_tokens = DEFAULT_MAX_TOKENS,
    json_mode = false,
    tools,
    tool_choice,
    timeout_ms = DEFAULT_TIMEOUT_MS,
  } = options;

  const requestBody: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: llmTextOf(m.content) })),
    temperature,
    max_tokens,
  };

  // Groq supports json_object response format
  if (json_mode) {
    requestBody.response_format = { type: "json_object" };
  }

  if (tools && tools.length > 0) {
    requestBody.tools = tools;
    if (tool_choice) requestBody.tool_choice = tool_choice;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeout_ms);

  try {
    const response = await fetch(`${groqBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[LLM] Groq API error (${response.status}): ${sanitizeApiError(errorText)}`);
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: { content?: string; tool_calls?: ToolCall[] };
        finish_reason?: string;
      }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const choice = data.choices?.[0];
    return {
      content: choice?.message?.content ?? "",
      tool_calls: choice?.message?.tool_calls,
      finish_reason: choice?.finish_reason ?? "stop",
      usage: data.usage,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`[LLM] Groq request timed out after ${timeout_ms}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Anthropic (native API) ────────────────────────────────────────────────────

async function callAnthropic(
  messages: LLMMessage[],
  options: LLMOptions,
): Promise<LLMResponse> {
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) throw new Error("[LLM] ANTHROPIC_API_KEY not configured");

  const defaultModel =
    Deno.env.get("ANTHROPIC_DEFAULT_MODEL") ?? "claude-sonnet-4-5";

  const {
    model = defaultModel,
    temperature = 0.2,
    max_tokens = DEFAULT_MAX_TOKENS,
    json_mode = false,
    timeout_ms = DEFAULT_TIMEOUT_MS,
  } = options;

  // Separate system message from chat messages (Anthropic API requirement)
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  // For JSON mode, inject JSON enforcement into system prompt
  let systemContent = systemMsg ? llmTextOf(systemMsg.content) : "";
  if (json_mode) {
    systemContent +=
      "\n\nYou MUST respond with valid JSON only. No prose, no markdown, just the JSON object.";
  }

  const requestBody: Record<string, unknown> = {
    model,
    max_tokens,
    temperature,
    messages: chatMessages.map((m) => ({
      role: m.role === "tool" ? "user" : m.role,
      content: m.content,
    })),
  };

  if (systemContent) {
    requestBody.system = systemContent;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeout_ms);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[LLM] Anthropic API error (${response.status}): ${sanitizeApiError(errorText)}`);
    }

    const data = await response.json() as {
      content?: Array<{ text?: string }>;
      stop_reason?: string;
      usage?: { input_tokens: number; output_tokens: number };
    };

    const content = data.content?.[0]?.text ?? "";
    const usage = data.usage
      ? {
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens: data.usage.input_tokens + data.usage.output_tokens,
        }
      : undefined;

    return {
      content,
      finish_reason: data.stop_reason ?? "end_turn",
      usage,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`[LLM] Anthropic request timed out after ${timeout_ms}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Higher-level helpers (backward-compatible exports) ────────────────────────

/**
 * Make a JSON-structured completion request.
 * Automatically parses the response as JSON.
 */
export async function callLLMJson<T = unknown>(
  messages: LLMMessage[],
  options: Omit<LLMOptions, "json_mode"> = {},
): Promise<{ data: T; usage?: LLMResponse["usage"] }> {
  const response = await callLLM(messages, {
    ...options,
    json_mode: true,
    temperature: options.temperature ?? 0.1,
  });

  try {
    const data = JSON.parse(response.content) as T;
    return { data, usage: response.usage };
  } catch {
    console.error("[LLM] Failed to parse JSON response:", response.content.substring(0, 200));
    throw new Error("[LLM] Provider returned invalid JSON");
  }
}

/**
 * Simple yes/no classification call with low temperature.
 */
export async function classifyYesNo(
  systemPrompt: string,
  content: string,
): Promise<{ answer: boolean; reason?: string }> {
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `${systemPrompt}\n\nRespond with JSON: {"answer": true/false, "reason": "brief explanation"}`,
    },
    { role: "user", content },
  ];

  const { data } = await callLLMJson<{ answer: boolean; reason?: string }>(messages, {
    temperature: 0,
    max_tokens: 150,
  });

  return data;
}

/**
 * Extract structured data from unstructured text.
 */
export async function extractStructured<T>(
  systemPrompt: string,
  content: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `${systemPrompt}\n\nExtract information according to this JSON schema:\n${JSON.stringify(schema, null, 2)}`,
    },
    { role: "user", content },
  ];

  const { data } = await callLLMJson<T>(messages, {
    temperature: 0.1,
  });

  return data;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sanitizeApiError(raw: string): string {
  // Never leak tokens, keys, or internal Supabase detail
  return raw
    .replace(/Bearer\s+[^\s"]+/gi, "Bearer [REDACTED]")
    .replace(/sk-[a-zA-Z0-9]+/g, "[REDACTED]")
    .substring(0, 300);
}
