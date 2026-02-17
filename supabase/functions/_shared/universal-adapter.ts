
import type { 
  LLMMessage, 
  LLMResponse, 
  LLMOptions 
} from "./llm.ts";

/**
 * Universal Adapter Interface
 * Standardizes interaction across different LLM providers.
 */
export interface UniversalAdapter {
  provider: "openai" | "anthropic" | "google" | "xai";

  buildRequest(messages: LLMMessage[], options: LLMOptions): unknown;
  parseResponse(raw: unknown): LLMResponse;
  
  stream(
    messages: LLMMessage[],
    options: LLMOptions,
    apiKey: string,
    endpoint: string,
    signal?: AbortSignal
  ): AsyncIterable<string>; // Returns chunks of text
}

// ============================================================
// Shared Helpers — single-source for all cross-adapter logic
// ============================================================

/**
 * Parse a single SSE "data: " line, apply stop-token filtering,
 * JSON-parse the payload, and extract content via a provider-specific extractor.
 */
function parseSSEDataLine(
  line: string,
  stopTokens: readonly string[],
  extractor: (data: unknown) => string | null
): string | null {
  const trimmed = line.trim();
  if (!trimmed || stopTokens.includes(trimmed)) return null;
  if (trimmed.startsWith("data: ")) {
    try {
      const data = JSON.parse(trimmed.slice(6));
      return extractor(data);
    } catch {
      // Partial SSE chunk — safe to skip
      return null;
    }
  }
  return null;
}

/** Shared request fields common to all streaming providers. */
function buildBaseRequestConfig(options: LLMOptions) {
  return {
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens,
    stream: true as const,
  };
}

/** Construct a normalized LLMResponse from provider-specific fragments. */
function buildLLMResponse(
  content: string,
  finishReason: string,
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
): LLMResponse {
  return { finish_reason: finishReason, content, usage };
}

/** Read SSE stream, parse each line, yield extracted content. */
async function* streamSSEResponse(
  endpoint: string,
  headers: HeadersInit,
  body: unknown,
  signal: AbortSignal | undefined,
  parseLine: (line: string) => string | null,
  providerName: string
): AsyncIterable<string> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${providerName.toUpperCase()} API Error ${response.status}: ${errorText}`);
  }

  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
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
        const content = parseLine(line);
        if (content) yield content;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ============================================================
// Abstract Base — owns the stream() method so adapters never duplicate it
// ============================================================

/**
 * Base class for SSE-streaming providers (OpenAI, Anthropic).
 * Provider-specific adapters supply only headers, stop-tokens,
 * and a content-extractor — zero stream logic duplication.
 */
abstract class BaseSSEAdapter implements UniversalAdapter {
  abstract readonly provider: "openai" | "anthropic" | "google" | "xai";

  abstract buildRequest(messages: LLMMessage[], options: LLMOptions): unknown;
  abstract parseResponse(raw: unknown): LLMResponse;

  /** Provider-specific HTTP headers for streaming requests. */
  protected abstract getStreamHeaders(apiKey: string): HeadersInit;
  /** Tokens that signal end-of-stream for this provider. */
  protected abstract readonly streamStopTokens: readonly string[];
  /** Extract text content from a parsed SSE JSON payload. */
  protected abstract extractStreamContent(data: unknown): string | null;

  public async *stream(
    messages: LLMMessage[],
    options: LLMOptions,
    apiKey: string,
    endpoint: string,
    signal?: AbortSignal
  ): AsyncIterable<string> {
    const body = this.buildRequest(messages, options);
    yield* streamSSEResponse(
      endpoint,
      this.getStreamHeaders(apiKey),
      body,
      signal,
      (line) => parseSSEDataLine(line, this.streamStopTokens, (d) => this.extractStreamContent(d)),
      this.provider
    );
  }
}

// ============================================================
// Concrete Adapters — only provider-unique logic, no duplication
// ============================================================

/**
 * OpenAI-Compatible Adapter (OpenAI, xAI, etc.)
 */
export class OpenAICompatibleAdapter extends BaseSSEAdapter {
  protected readonly streamStopTokens = ["data: [DONE]"] as const;

  constructor(public readonly provider: "openai" | "xai" = "openai") {
    super();
  }

  protected getStreamHeaders(apiKey: string): HeadersInit {
    return { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  }

  protected extractStreamContent(data: unknown): string | null {
    return (data as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content || null;
  }

  public buildRequest(messages: LLMMessage[], options: LLMOptions): unknown {
    return {
      model: options.model || (this.provider === "xai" ? "grok-beta" : "gpt-4o"),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      ...buildBaseRequestConfig(options),
    };
  }

  public parseResponse(raw: unknown): LLMResponse {
    const data = raw as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };
    return buildLLMResponse(
      data.choices?.[0]?.message?.content ?? "",
      data.choices?.[0]?.finish_reason ?? "unknown",
      data.usage
    );
  }
}

/**
 * Anthropic Adapter
 */
export class AnthropicAdapter extends BaseSSEAdapter {
  public readonly provider = "anthropic" as const;
  protected readonly streamStopTokens = ["event: ping"] as const;

  protected getStreamHeaders(apiKey: string): HeadersInit {
    return { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
  }

  protected extractStreamContent(data: unknown): string | null {
    const d = data as { type?: string; delta?: { text?: string } };
    return d.type === "content_block_delta" ? d.delta?.text || null : null;
  }

  public buildRequest(messages: LLMMessage[], options: LLMOptions): unknown {
    const systemMessage = messages.find(m => m.role === "system");
    const chatMessages = messages.filter(m => m.role !== "system");
    const base = buildBaseRequestConfig(options);

    return {
      model: options.model || "claude-3-opus-20240229",
      system: systemMessage?.content,
      messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: base.max_tokens ?? 4096,
      temperature: base.temperature,
      stream: base.stream,
    };
  }

  public parseResponse(raw: unknown): LLMResponse {
    const data = raw as {
      content?: { text?: string }[];
      stop_reason?: string;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const inputTokens = data.usage?.input_tokens ?? 0;
    const outputTokens = data.usage?.output_tokens ?? 0;
    return buildLLMResponse(
      data.content?.[0]?.text ?? "",
      data.stop_reason ?? "unknown",
      { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens }
    );
  }
}

/**
 * Google Gemini Adapter
 * Uses single-shot HTTP (not SSE) — stream() returns the full response as one chunk.
 */
export class GoogleAdapter implements UniversalAdapter {
  public readonly provider = "google" as const;

  public buildRequest(messages: LLMMessage[], options: LLMOptions): unknown {
    const base = buildBaseRequestConfig(options);
    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    return {
      contents,
      generationConfig: {
        temperature: base.temperature,
        maxOutputTokens: base.max_tokens,
      }
    };
  }

  public parseResponse(raw: unknown): LLMResponse {
    const data = raw as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    };
    return buildLLMResponse(
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      data.candidates?.[0]?.finishReason ?? "unknown"
    );
  }

  public async *stream(
    messages: LLMMessage[],
    options: LLMOptions,
    apiKey: string,
    _endpoint: string,
    signal?: AbortSignal
  ): AsyncIterable<string> {
    const model = options.model || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = this.buildRequest(messages, options);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GOOGLE API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const parsed = this.parseResponse(data);
    if (parsed.content) yield parsed.content;
  }
}

// ============================================================
// Factory
// ============================================================

export function createAdapter(provider: string): UniversalAdapter {
  switch (provider) {
    case "openai": return new OpenAICompatibleAdapter("openai");
    case "xai": return new OpenAICompatibleAdapter("xai");
    case "anthropic": return new AnthropicAdapter();
    case "google": return new GoogleAdapter();
    default: throw new Error(`Unsupported provider: ${provider}`);
  }
}
