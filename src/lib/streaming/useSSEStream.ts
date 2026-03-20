/**
 * useSSEStream — React Hook for SSE token streaming from apex-assistant
 *
 * Uses fetch + ReadableStream (NOT EventSource) for full control over
 * request headers and authorization. Parses the standard SSE wire format
 * (`data: <payload>\n\n`) and accumulates tokens into a complete response.
 *
 * @module lib/streaming/useSSEStream
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
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
    (typeof import.meta !== 'undefined' && (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_SUPABASE_URL) ?? '';
  if (!base) return '';
  // Supabase edge functions live at <project-url>/functions/v1/<fn-name>
  return `${base.replace(/\/{1,10}$/, '')}/functions/v1/apex-assistant`;
}

// ============================================================================
// Hook
// ============================================================================

export function useSSEStream(): UseSSEStreamReturn {
  const [tokens, setTokens] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AbortController ref — survives across renders and allows cancellation.
  const abortRef = useRef<AbortController | null>(null);

  // Track mounted state so we never call setState after unmount.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Abort any in-flight stream on unmount.
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
      // Cancel any previous in-flight request.
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      // Reset state for the new stream.
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

      // Kick off the async streaming pipeline.
      (async () => {
        try {
          // Retrieve the current Supabase auth token.
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token ?? '';

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              ...options?.headers,
            },
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

          const decoder = new TextDecoder();
          let accumulated = '';
          let lineBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            lineBuffer += decoder.decode(value, { stream: true });

            // SSE frames are delimited by double newlines. Individual fields
            // within a frame are separated by single newlines.
            const lines = lineBuffer.split('\n');

            // Keep the last (potentially incomplete) line in the buffer.
            lineBuffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();

              // Skip empty lines and comments.
              if (trimmed === '' || trimmed.startsWith(':')) continue;

              if (trimmed.startsWith('data: ')) {
                const payload = trimmed.slice(6);

                // Handle the completion sentinel.
                if (payload === SSE_DONE_SENTINEL) {
                  if (mountedRef.current) {
                    setIsStreaming(false);
                  }
                  options?.onComplete?.(accumulated);
                  return;
                }

                // Treat the payload as a raw token string.
                accumulated += payload;
                if (mountedRef.current) {
                  // Use functional update to avoid stale closure over `tokens`.
                  setTokens((prev) => prev + payload);
                }
                options?.onToken?.(payload);
              }
            }
          }

          // The stream ended without a [DONE] sentinel — still treat as complete.
          if (mountedRef.current) {
            setIsStreaming(false);
          }
          options?.onComplete?.(accumulated);
        } catch (err: unknown) {
          // AbortError is expected when the consumer calls abort(); don't surface it.
          if (err instanceof DOMException && err.name === 'AbortError') {
            return;
          }
          const error = err instanceof Error ? err : new Error(String(err));
          if (mountedRef.current) {
            setError(error.message);
            setIsStreaming(false);
          }
          options?.onError?.(error);
        } finally {
          // Clear the controller ref if it is still ours.
          if (abortRef.current === controller) {
            abortRef.current = null;
          }
        }
      })();
    },
    [],
  );

  return { stream, tokens, isStreaming, error, abort };
}
