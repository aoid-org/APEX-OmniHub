/**
 * OmniBoardWizard — Deterministic Connect-Only Onboarding Engine
 * Wires the React UI to the Python FSM via the orchestrator HTTP API.
 *
 * FSM States: IDLE_LISTEN → APP_IDENTIFICATION → AUTH_SETUP →
 *             AUTH_COMPLETE → VERIFY_CONNECTION → REGISTER_CONNECTION →
 *             COMPLETION | RECOVERY_RETRY
 *
 * APEX STANDARDS: No workflow questions. Connect only. Output Connection Spec.
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
// Relative import (not '@/hooks/...'): the root vitest config resolves '@' to
// the root src tree, so an alias here would break under the test harness.
import {
  appendTranscript,
  useSpeechRecognition,
} from '../../src/hooks/useSpeechRecognition';

// The orchestrator URL — must be set via VITE_ORCHESTRATOR_URL in .env
const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL ?? '';

// Hard ceiling for any orchestrator round-trip. Without this a hung connection
// service leaves the wizard spinning forever; on timeout we surface an explicit
// "timed out" error rather than faking progress or a successful connection.
const OMNIBOARD_REQUEST_TIMEOUT_MS = 15000;

/** A configured orchestrator URL must be an absolute http(s) URL. */
function isValidAbsoluteUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OMNIBOARD_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const UNREACHABLE_COPY =
  'Connection service unreachable. The OmniBoard app-integration service could not be reached from this browser. Check orchestrator URL, gateway routing, and CORS.';
const TIMEOUT_COPY =
  'Connection service timed out. The OmniBoard app-integration service did not respond. Check orchestrator URL, gateway routing, and CORS.';

/** Map a thrown fetch error to explicit, honest connection-error copy. */
function describeConnectionError(err: unknown, fallback: string): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return TIMEOUT_COPY;
  }
  if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
    return UNREACHABLE_COPY;
  }
  return err instanceof Error ? err.message : fallback;
}

interface FSMContext {
  session_id: string;
  tenant_id: string;
  state: string;
  trace_id: string;
  provider_name?: string;
  auth_type?: string;
}

interface WizardProps {
  readonly onComplete: (connectionSpec: Record<string, unknown>) => void;
  readonly onDismiss: () => void;
}

export function OmniBoardWizard({ onComplete, onDismiss }: WizardProps) {
  const [context, setContext] = useState<FSMContext | null>(null);
  const [message, setMessage] = useState<string>('Tell OmniBoard what app or provider you want to connect.');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isListening, toggle: handleVoiceToggle, stop: stopVoice } = useSpeechRecognition({
    onTranscript: (transcript) => setInput(prev => appendTranscript(prev, transcript)),
    onUnsupported: () => setError('Voice input is not supported in this browser.'),
    onError: () => setError('Voice capture failed. Please retry.'),
  });

  const handleDismiss = useCallback(() => {
    stopVoice();
    onDismiss();
  }, [onDismiss, stopVoice]);

  const startSession = useCallback(async () => {
    // Invalid (but present) orchestrator URL → explicit config error, no fetch.
    if (ORCHESTRATOR_URL && !isValidAbsoluteUrl(ORCHESTRATOR_URL)) {
      setError('OmniBoard orchestrator URL is invalid. Set a valid absolute VITE_ORCHESTRATOR_URL (https://…).');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Authentication required'); return; }

    setLoading(true);
    try {
      const res = await fetchWithTimeout(`${ORCHESTRATOR_URL}/omniboard/start?tenant_id=${user.id}&trace_id=${crypto.randomUUID()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Connection service rejected the request: HTTP ${res.status}.`);
      const ctx: FSMContext = await res.json();
      setContext(ctx);
      setMessage('Tell OmniBoard what app or provider you want to connect.');
    } catch (err) {
      setError(describeConnectionError(err, 'Failed to start session'));
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTurn = useCallback(async () => {
    if (!context || !input.trim()) return;
    setLoading(true);
    try {
      const res = await fetchWithTimeout(`${ORCHESTRATOR_URL}/omniboard/${context.session_id}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'user_input', payload: { text: input.trim() } }),
      });
      if (!res.ok) throw new Error(`Connection service rejected the request: HTTP ${res.status}.`);
      const { context: newCtx, message: newMsg, connection_spec } = await res.json() as {
        context: FSMContext;
        message: string;
        connection_spec?: Record<string, unknown>;
      };
      setContext(newCtx);
      setMessage(newMsg);
      setInput('');
      if (newCtx.state === 'COMPLETION' && connection_spec) {
        onComplete(connection_spec);
      }
    } catch (err) {
      setError(describeConnectionError(err, 'Failed to process turn'));
    } finally {
      setLoading(false);
    }
  }, [context, input, onComplete]);

  useEffect(() => {
    void startSession();
  }, [startSession]);

  return (
    <div className="flex flex-col gap-4 p-4 bg-card rounded-xl border border-border/40 max-w-md w-[400px]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">OmniBoard — App Integration</h3>
        <button type="button" onClick={handleDismiss} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="rounded-lg bg-muted/20 p-3 text-xs text-foreground leading-relaxed min-h-[60px]">
        {message}
      </div>
      {context && context.state !== 'COMPLETION' && (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void sendTurn()}
            placeholder="Type your response..."
            className="flex-1 bg-background border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary/60"
          />
          <button
            type="button"
            onClick={handleVoiceToggle}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            title={isListening ? 'Stop voice input' : 'Speak your response'}
            className={`px-3 py-2 rounded-lg border text-xs font-bold ${
              isListening
                ? 'border-red-400/60 text-red-400 animate-pulse'
                : 'border-border/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            {isListening ? '⏹' : '🎤'}
          </button>
          <button
            type="button"
            onClick={() => void sendTurn()}
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
          >
            {loading ? '…' : '→'}
          </button>
        </div>
      )}
      {!context && (
        <button
          type="button"
          onClick={() => void startSession()}
          disabled={loading}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
        >
          {loading ? 'Starting session…' : 'Start Connecting'}
        </button>
      )}
      <p className="text-[10px] text-muted-foreground text-center">
        OmniBoard only connects apps. No workflows. No automation. Just the connection.
      </p>
    </div>
  );
}
