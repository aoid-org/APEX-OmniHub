
import {
  llmTextOf,
  type LLMMessage,
  type LLMResponse,
  type LLMOptions,
} from "./llm.ts";

// ─── Provider-specific raw response types ────────────────────────────────────

/** Raw response shape from OpenAI-compatible APIs (Groq uses this wire format). */
interface OpenAICompatRawResponse {
  choices?: { message?: { content?: string }; finish_reason?: string; delta?: { content?: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/** Raw response shape from Anthropic API. */
interface AnthropicRawResponse {
  content?: { text?: string }[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  type?: string;
  delta?: { text?: string };
}

// ─── Shared SSE stream reader ─────────────────────────────────────────────────

function parseSSELine(
  line: string,
  skipPatterns: string[],
  extractContent: (parsed: Record<string, unknown>) => string | undefined,
): string | undefined {
  const trimmed = line.trim();
  if (!trimmed || skipPatterns.includes(trimmed)) return undefined;

  if (trimmed.startsWith("data: ")) {
    try {
      const data = JSON.parse(trimmed.slice(6)) as Record<string, unknown>;
      return extractContent(data);
    } catch {
      // Ignore parse errors on partial chunks
    }
  }
  return undefined;
}

/**
 * Reads an SSE stream from a ReadableStream and yields parsed JSON data lines.
 * Shared by Groq and Anthropic adapters.
 */
async function* readSSEStream(
  body: ReadableStream<Uint8Array>,
  skipPatterns: string[],
  extractContent: (parsed: Record<string, unknown>) => string | undefined,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const content = parseSSELine(line, skipPatterns, extractContent);
        if (content) yield content;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Adapter Interface ────────────────────────────────────────────────────────

/**
 * Universal Adapter Interface — Groq + Anthropic ONLY.
 *
 * APEX Policy: openai, xai, google are FORBIDDEN runtime providers.
 * Groq uses OpenAI-compatible wire format but routes to api.groq.com ONLY.
 */
export interface UniversalAdapter {
  provider: "groq" | "anthropic";

  buildRequest(messages: LLMMessage[], options: LLMOptions): unknown;
  parseResponse(raw: unknown): LLMResponse;

  stream(
    messages: LLMMessage[],
    options: LLMOptions,
    apiKey: string,
    endpoint: string,
    signal?: AbortSignal,
  ): AsyncIterable<string>;
}

// ─── Groq Adapter (OpenAI-compatible wire, Groq endpoint only) ───────────────

/**
 * GroqAdapter — uses OpenAI-compatible chat completions wire format.
 * ONLY valid endpoint: https://api.groq.com/openai/v1
 * Never routes to api.openai.com.
 */
export class GroqAdapter implements UniversalAdapter {
  public readonly provider = "groq" as const;

  public buildRequest(messages: LLMMessage[], options: LLMOptions): unknown {
    const defaultModel = "llama-3.1-8b-instant";
    return {
      model: options.model ?? defaultModel,
      // Groq (OpenAI wire) is text-only in this contract: collapse any
      // multimodal blocks to their text so image attachments degrade safely.
      messages: messages.map((m) => ({
        role: m.role,
        content: llmTextOf(m.content),
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: true,
    };
  }

  public parseResponse(raw: unknown): LLMResponse {
    const data = raw as OpenAICompatRawResponse;
    const content = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage
      ? {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens,
        }
      : undefined;

    return {
      finish_reason: data.choices?.[0]?.finish_reason ?? "stop",
      content,
      usage,
    };
  }

  public async *stream(
    messages: LLMMessage[],
    options: LLMOptions,
    apiKey: string,
    endpoint: string,
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    // Security: validate endpoint is Groq (never api.openai.com)
    assertGroqEndpoint(endpoint);

    const body = this.buildRequest(messages, options);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    if (!response.body) throw new Error("[GroqAdapter] No response body");

    yield* readSSEStream(
      response.body,
      ["data: [DONE]"],
      (parsed) => {
        const choices = parsed["choices"] as OpenAICompatRawResponse["choices"];
        return choices?.[0]?.delta?.content;
      },
    );
  }
}

// ─── Anthropic Adapter ────────────────────────────────────────────────────────

/**
 * AnthropicAdapter — native Anthropic Messages API.
 */
export class AnthropicAdapter implements UniversalAdapter {
  public readonly provider = "anthropic" as const;

  public buildRequest(messages: LLMMessage[], options: LLMOptions): unknown {
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");
    const defaultModel = "claude-sonnet-4-5";

    return {
      model: options.model ?? defaultModel,
      // System is always a plain string for Anthropic; collapse defensively.
      system: systemMessage ? llmTextOf(systemMessage.content) : undefined,
      // Chat messages pass through unchanged — Anthropic natively accepts both a
      // plain string and an ordered array of text/image content blocks. This is
      // the multimodal ("Eyes") path: image blocks reach the vision model intact.
      messages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: options.max_tokens ?? 4_096,
      temperature: options.temperature ?? 0.7,
      stream: true,
    };
  }

  public parseResponse(raw: unknown): LLMResponse {
    const data = raw as AnthropicRawResponse;
    const content = data.content?.[0]?.text ?? "";
    return {
      finish_reason: data.stop_reason ?? "end_turn",
      content,
      usage: {
        prompt_tokens: data.usage?.input_tokens ?? 0,
        completion_tokens: data.usage?.output_tokens ?? 0,
        total_tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
    };
  }

  public async *stream(
    messages: LLMMessage[],
    options: LLMOptions,
    apiKey: string,
    endpoint: string,
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    const body = this.buildRequest(messages, options);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API Error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    if (!response.body) throw new Error("[AnthropicAdapter] No response body");

    yield* readSSEStream(
      response.body,
      ["event: ping"],
      (parsed) => {
        const event = parsed as unknown as AnthropicRawResponse;
        if (event.type === "content_block_delta" && event.delta?.text) {
          return event.delta.text;
        }
        return undefined;
      },
    );
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create an adapter for the given provider.
 *
 * APEX Policy enforced:
 * - 'groq'      → GroqAdapter (OpenAI-compatible wire via api.groq.com)
 * - 'anthropic' → AnthropicAdapter
 * - 'openai'    → throws (FORBIDDEN)
 * - 'xai'       → throws (FORBIDDEN)
 * - 'google'    → throws (FORBIDDEN)
 * - anything else → throws
 */
export function createAdapter(provider: string): UniversalAdapter {
  switch (provider) {
    case "groq":
      return new GroqAdapter();
    case "anthropic":
      return new AnthropicAdapter();
    case "openai":
    case "xai":
    case "google":
    case "gemini":
      throw new Error(
        `[universal-adapter] Provider '${provider}' is disabled by APEX policy. ` +
          `Only 'groq' and 'anthropic' are permitted runtime providers.`,
      );
    default:
      throw new Error(
        `[universal-adapter] Unknown provider: '${provider}'. ` +
          `Allowed: 'groq', 'anthropic'.`,
      );
  }
}

// ─── Security guard ───────────────────────────────────────────────────────────

/**
 * Assert that the endpoint is a Groq endpoint, never api.openai.com.
 * Groq uses OpenAI wire protocol but only through api.groq.com.
 */
function assertGroqEndpoint(endpoint: string): void {
  if (endpoint.includes("api.openai.com")) {
    throw new Error(
      "[GroqAdapter] SECURITY VIOLATION: Attempted to route to api.openai.com. " +
        "Groq MUST use https://api.groq.com/openai/v1 only.",
    );
  }
  if (!endpoint.includes("api.groq.com")) {
    throw new Error(
      `[GroqAdapter] Invalid Groq endpoint: '${endpoint}'. Must be https://api.groq.com/openai/v1`,
    );
  }
}
