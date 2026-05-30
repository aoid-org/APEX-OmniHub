/**
 * useSSEStream — React Hook for SSE token streaming from APEX Agent
 *
 * Uses fetch + ReadableStream (NOT EventSource) for full control over
 * request headers and authorization. Parses the standard SSE wire format
 * (`data: <payload>\n\n`) and accumulates tokens into a complete response.
 *
 * @module lib/streaming/useSSEStream
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { useState, useCallback, useRef, useEffect, type MutableRefObject } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface StreamOptions {
  /** Override the default edge-function endpoint. */
  endpoint?: string;
  /** Additional headers merged into the request. */
  headers?: Record<string, string>;
  /** Invoked for every individual token received. */
  onToken?: (token: string) => void;
  /** Invoked once the stream completes with the full accumulated text. */
  onComplete?: (fullText: string) => void;
  /** Invoked when an error occurs during streaming. */
  onError?: (error: Error) => void;
}

export interface UseSSEStreamReturn {
  /** Initiate a streaming request. */
  stream: (input: string, options?: StreamOptions) => void;
  /** Accumulated tokens received so far. */
  tokens: string;
  /** Whether a stream is currently in flight. */
  isStreaming: boolean;
  /** Latest error message, or null if none. */
  error: string | null;
  /** Abort the in-flight stream. */
  abort: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const SSE_DONE_SENTINEL = '[DONE]';

/**
 * Build the default endpoint URL from the Supabase project URL.
 * Falls back to an empty string when the env var is absent (the caller should
 * supply an explicit endpoint in that case).
 */
function getDefaultEndpoint(): string {
  const base =
    (import.meta !== undefined && (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_SUPABASE_URL) ?? '';
  if (!base) return '';
  return `${base.replace(/\/{1,10}$/, '')}/functions/v1/apex-agent`;
}

/**
 * Build request headers with optional auth token.
 */
async function buildRequestHeaders(
  extraHeaders?: Record<string, string>,
): Promise<Record<string, string>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token ?? '';
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extraHeaders,
  };
}

/**
 * Result of processing a single SSE line.
 * - 'done' means the stream sent the [DONE] sentinel
 * - 'token' means a token was received
 * - 'skip' means the line was empty, a comment, or not a data field
 */
type SSELineResult =
  | { kind: 'done' }
  | { kind: 'token'; payload: string }
  | { kind: 'skip' };

function parseSSELine(line: string): SSELineResult {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith(':')) return { kind: 'skip' };
  if (!trimmed.startsWith('data: ')) return { kind: 'skip' };

  const payload = trimmed.slice(6);
  if (payload === SSE_DONE_SENTINEL) return { kind: 'done' };
  return { kind: 'token', payload };
}

/**
 * Reads an SSE response body and invokes callbacks for each token.
 * Returns the full accumulated text.
 */
async function consumeSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onToken: (payload: string) => void,
): Promise<string> {
  const decoder = new TextDecoder();
  let accumulated = '';
  let lineBuffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
      const result = parseSSELine(line);
      if (result.kind === 'done') return accumulated;
      if (result.kind === 'token') {
        accumulated += result.payload;
        onToken(result.payload);
      }
    }
  }

  return accumulated;
}

// ============================================================================
// Stream executor (extracted to avoid deep nesting inside useCallback)
// ============================================================================

async function executeStream(
  endpoint: string,
  input: string,
  controller: AbortController,
  options: StreamOptions | undefined,
  onToken: (payload: string) => void,
  context: {
    mountedRef: MutableRefObject<boolean>;
    setIsStreaming: (v: boolean) => void;
    setError: (v: string | null) => void;
    abortRef: MutableRefObject<AbortController | null>;
  },
): Promise<void> {
  const { mountedRef, setIsStreaming, setError, abortRef } = context;

  try {
    const headers = await buildRequestHeaders(options?.headers);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ input }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable.');
    }

    const accumulated = await consumeSSEStream(reader, onToken);

    if (mountedRef.current) {
      setIsStreaming(false);
    }
    options?.onComplete?.(accumulated);
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    const streamError = err instanceof Error ? err : new Error(String(err));
    if (mountedRef.current) {
      setError(streamError.message);
      setIsStreaming(false);
    }
    options?.onError?.(streamError);
  } finally {
    if (abortRef.current === controller) {
      abortRef.current = null;
    }
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useSSEStream(): UseSSEStreamReturn {
  const [tokens, setTokens] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (mountedRef.current) {
      setIsStreaming(false);
    }
  }, []);

  const stream = useCallback(
    (input: string, options?: StreamOptions) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setTokens('');
      setError(null);
      setIsStreaming(true);

      const endpoint = options?.endpoint || getDefaultEndpoint();

      if (!endpoint) {
        const err = new Error('No streaming endpoint configured. Set VITE_SUPABASE_URL or pass an explicit endpoint.');
        setError(err.message);
        setIsStreaming(false);
        options?.onError?.(err);
        return;
      }

      const handleToken = (payload: string) => {
        if (mountedRef.current) {
          setTokens((prev) => prev + payload);
        }
        options?.onToken?.(payload);
      };

      executeStream(endpoint, input, controller, options, handleToken, {
        mountedRef,
        setIsStreaming,
        setError,
        abortRef,
      });
    },
    [],
  );

  return { stream, tokens, isStreaming, error, abort };
}
