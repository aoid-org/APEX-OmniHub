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

// Hard ceiling for any orchestrator round-trip. Without this a hung connection
// service leaves the wizard spinning forever; on timeout we surface an explicit
// "timed out" error rather than faking progress or a successful connection.
const OMNIBOARD_REQUEST_TIMEOUT_MS = 15000;

// OmniBoard routes ALL orchestrator calls through Supabase Edge Functions
// (omnilink-port/omniboard-*) so they transit https://*.supabase.co — already
// in the app CSP connect-src — eliminating any cross-origin CSP violation.
// VITE_ORCHESTRATOR_URL is only read server-side inside the edge function.

async function invokeWithTimeout<T>(
  fn: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: Error | null }> {
  return Promise.race([
    supabase.functions.invoke<T>(fn, { body }),
    new Promise<{ data: null; error: Error }>((resolve) =>
      setTimeout(
        () => resolve({ data: null, error: new Error('omniboard_timeout') }),
        OMNIBOARD_REQUEST_TIMEOUT_MS,
      ),
    ),
  ]);
}

function describeConnectionError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message === 'omniboard_timeout') {
    return 'Connection service timed out. The OmniBoard integration gateway did not respond.';
  }
  const raw = err instanceof Error ? err.message : '';
  // supabase-js surfaces opaque transport strings for Edge Function failures
  // (e.g. "Edge Function returned a non-2xx status code"). These are not user
  // copy — map them to an honest message instead of leaking transport detail.
  // Genuinely descriptive errors still pass through unchanged.
  if (
    /non-2xx status code|Relay Error invoking the Edge Function|Failed to send a request to the Edge Function/i.test(
      raw,
    )
  ) {
    return 'OmniBoard could not complete the connection \u2014 the integration gateway is unavailable right now. No app was connected.';
  }
  return raw || fallback;
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Authentication required'); return; }

    setLoading(true);
    try {
      const { data, error } = await invokeWithTimeout<FSMContext>(
        'omnilink-port/omniboard-start',
        { tenant_id: user.id, trace_id: crypto.randomUUID() },
      );
      if (error || !data) throw error ?? new Error('No response from connection gateway.');
      setContext(data);
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
      // Contract: event_type=USER_INPUT, payload.user_input matches FSM
      // event.payload.get("user_input") in _handle_idle_listen / _handle_app_disambiguation.
      type TurnResponse = { context: FSMContext; message: string; connection_spec?: Record<string, unknown> };
      const { data, error } = await invokeWithTimeout<TurnResponse>(
        'omnilink-port/omniboard-next',
        { session_id: context.session_id, event_type: 'USER_INPUT', payload: { user_input: input.trim() } },
      );
      if (error || !data) throw error ?? new Error('No response from connection gateway.');
      setContext(data.context);
      setMessage(data.message);
      setInput('');
      // connection_spec is normalised by the edge function from context.final_spec.
      if (data.context.state === 'COMPLETION' && data.connection_spec) {
        onComplete(data.connection_spec);
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
          {loading ? 'Starting session…' : error ? 'Retry Connection' : 'Start Connecting'}
        </button>
      )}
      <p className="text-[10px] text-muted-foreground text-center">
        OmniBoard only connects apps. No workflows. No automation. Just the connection.
      </p>
    </div>
  );
}
