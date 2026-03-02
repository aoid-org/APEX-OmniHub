/**
 * BridgeFSM — Semantic Bridge FSM Renderer
 * @version 1.0.0
 * @module apps/omnihub-site/src/components/omnidash/BridgeFSM
 *
 * Exhaustive FSM switch over BridgeAction → shadcn-equivalent Tailwind component.
 * Unknown actions throw a never assertion — no silent fallthrough.
 *
 * FSM Map (deterministic, exhaustive):
 *   PENDING_NETWORK  → <Spinner label="Awaiting network..." />
 *   PROCESSING       → <Progress indeterminate />
 *   SETTLED          → <CheckCircle label="Confirmed" />
 *   RECONCILED       → <CheckCircle label="Reconciled — Δ $0.00" />
 *   MAN_MODE_LOCKDOWN → MANModeModal (unclosable, requiresAuth)
 *
 * APEX STANDARDS:
 * - No nested ternary (single level only)
 * - Cognitive complexity ≤ 15 per function
 * - All IDs: crypto.randomUUID()
 * - No src/ imports (apps/omnihub-site isolation enforced)
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo, useCallback, useState } from 'react';
import type { BridgeAction, BridgePayload, MANModeCredential } from './bridge-types';

// ── Sub-components ────────────────────────────────────────────────────────────

interface SpinnerProps {
  readonly label: string;
}

function Spinner({ label }: SpinnerProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.03]">
      <div
        className="h-5 w-5 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin"
        aria-hidden="true"
      />
      <span className="text-sm font-semibold text-zinc-300">{label}</span>
    </div>
  );
}

interface ProgressProps {
  readonly label?: string;
}

function Progress({ label = 'Processing…' }: ProgressProps) {
  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-zinc-300">{label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-orange-500 rounded-full animate-pulse w-3/4" />
      </div>
    </div>
  );
}

interface CheckCircleProps {
  readonly label: string;
}

function CheckCircle({ label }: CheckCircleProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06]">
      <svg
        className="h-5 w-5 text-emerald-400 flex-shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
      <span className="text-sm font-semibold text-emerald-300">{label}</span>
    </div>
  );
}

// ── MANModeModal ──────────────────────────────────────────────────────────────

interface MANModeModalProps {
  readonly anomaly: string;
  readonly onDismiss: (credential: MANModeCredential) => void;
}

function MANModeModal({ anomaly, onDismiss }: MANModeModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleMultiSig = useCallback(() => {
    const trimmed = code.trim();
    const SIX_DIGIT_RE = /^\d{6}$/;
    if (!SIX_DIGIT_RE.test(trimmed)) {
      setError('Enter exactly 6 digits');
      return;
    }
    setError(null);
    onDismiss({ kind: 'multisig', code: trimmed });
  }, [code, onDismiss]);

  const handleBiometric = useCallback(async () => {
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          timeout: 60000,
          userVerification: 'required',
        },
      });
      if (credential instanceof PublicKeyCredential) {
        onDismiss({ kind: 'biometric', assertion: credential });
      }
    } catch {
      setError('Biometric authentication failed or was cancelled');
    }
  }, [onDismiss]);

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value),
    [],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="MAN Mode Lockdown — Authorization Required"
    >
      {/* Backdrop — not dismissable */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 p-6 rounded-2xl border border-red-500/30 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-extrabold text-red-400 uppercase tracking-wider">
              MAN Mode Lockdown
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Authorization required to resume</p>
          </div>
        </div>

        {/* Anomaly */}
        <div className="mb-5 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
          <p className="text-xs font-mono text-red-300 break-all">{anomaly}</p>
        </div>

        {/* Auth options */}
        <div className="space-y-3">
          {/* Biometric */}
          <button
            type="button"
            onClick={handleBiometric}
            className="w-full py-2.5 px-4 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-sm font-semibold hover:bg-orange-500/20 transition-colors"
          >
            Authenticate with Biometric
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-zinc-500">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* 6-digit code */}
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              placeholder="6-digit code"
              className="flex-1 py-2.5 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm font-mono placeholder-zinc-600 focus:outline-none focus:border-orange-500/50"
              aria-label="Six-digit multi-sig authorization code"
            />
            <button
              type="button"
              onClick={handleMultiSig}
              className="px-4 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              Submit
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 mt-1" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── BridgeFSM ─────────────────────────────────────────────────────────────────

export interface BridgeFSMProps {
  /** Current bridge payload — null renders nothing */
  readonly payload: BridgePayload | null;
  /** Called when MAN mode is dismissed with a valid credential */
  readonly onMANModeDismissed?: (credential: MANModeCredential) => void;
}

/**
 * BridgeFSM — renders the correct UI state for each BridgeAction.
 *
 * Exhaustive switch: adding a new BridgeAction without updating this
 * component will cause a TypeScript compile error via never assertion.
 */
export const BridgeFSM = memo(function BridgeFSM({
  payload,
  onMANModeDismissed,
}: BridgeFSMProps) {
  const handleDismiss = useCallback(
    (credential: MANModeCredential) => {
      onMANModeDismissed?.(credential);
    },
    [onMANModeDismissed],
  );

  if (!payload) return null;

  return renderBridgeAction(payload, handleDismiss);
});

BridgeFSM.displayName = 'BridgeFSM';

// ── FSM renderer (extracted to keep cognitive complexity ≤ 15) ─────────────────

function renderBridgeAction(
  payload: BridgePayload,
  onDismiss: (credential: MANModeCredential) => void,
): React.ReactElement {
  const action: BridgeAction = payload.action;

  switch (action) {
    case 'PENDING_NETWORK':
      return <Spinner label="Awaiting network…" />;

    case 'PROCESSING':
      return <Progress label="Processing transaction…" />;

    case 'SETTLED':
      return <CheckCircle label="Confirmed" />;

    case 'RECONCILED': {
      const label = 'Reconciled \u2014 \u0394 $0.00';
      return <CheckCircle label={label} />;
    }

    case 'MAN_MODE_LOCKDOWN':
      return (
        <MANModeModal
          anomaly={payload.anomaly ?? 'Anomaly detected — authorization required'}
          onDismiss={onDismiss}
        />
      );

    default: {
      // Exhaustive check — TypeScript will error if a new BridgeAction is added
      // without handling it here. Never silently falls through.
      const _exhaustive: never = action;
      throw new Error(`BridgeFSM: unhandled action ${String(_exhaustive)}`);
    }
  }
}
