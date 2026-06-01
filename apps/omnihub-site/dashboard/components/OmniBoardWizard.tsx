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

// The orchestrator URL — must be set via VITE_ORCHESTRATOR_URL in .env
const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL ?? '';

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
  const [message, setMessage] = useState<string>('What app would you like to connect?');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Authentication required'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/omniboard/start?tenant_id=${user.id}&trace_id=${crypto.randomUUID()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`FSM start failed: ${res.status}`);
      const ctx: FSMContext = await res.json();
      setContext(ctx);
      setMessage('What app would you like to connect? (e.g. "Connect Salesforce", "Connect Stripe")');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTurn = useCallback(async () => {
    if (!context || !input.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/omniboard/${context.session_id}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'user_input', payload: { text: input.trim() } }),
      });
      if (!res.ok) throw new Error(`FSM turn failed: ${res.status}`);
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
      setError(err instanceof Error ? err.message : 'Failed to process turn');
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
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">OmniBoard — Connect App</h3>
        <button type="button" onClick={onDismiss} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
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
