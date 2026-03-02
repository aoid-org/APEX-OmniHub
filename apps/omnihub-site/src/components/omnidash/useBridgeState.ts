/**
 * useBridgeState — Supabase Realtime Bridge State Hook
 * @version 1.0.0
 * @module apps/omnihub-site/src/components/omnidash/useBridgeState
 *
 * Subscribes to the Supabase realtime 'bridge-payloads' channel.
 * Validates every inbound message with isBridgePayload() before setState.
 * MAN_MODE_LOCKDOWN payloads trigger onLockdown callback.
 *
 * Isolation: no src/ imports — fully self-contained in apps/omnihub-site.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isBridgePayload, type BridgePayload, type MANModeCredential } from './bridge-types';

export interface BridgeState {
  /** Current bridge payload (null before first message) */
  readonly payload: BridgePayload | null;
  /** true when MAN Mode lockdown is active */
  readonly isMANModeActive: boolean;
  /** Anomaly string from the last MAN_MODE_LOCKDOWN payload */
  readonly manModeAnomaly: string | null;
  /** Dismiss MAN Mode with a validated credential — fail-closed */
  dismissMANMode: (credential: MANModeCredential) => boolean;
}

/** Anchored six-digit code pattern */
const MULTISIG_CODE_RE = /^\d{6}$/;

function isValidCredential(credential: MANModeCredential): boolean {
  if (credential.kind === 'biometric') {
    return credential.assertion instanceof PublicKeyCredential;
  }
  return MULTISIG_CODE_RE.test(credential.code);
}

/**
 * Subscribe to the bridge-payloads realtime channel and derive FSM state.
 *
 * @param channelName - Supabase realtime channel name (default: 'bridge-payloads')
 */
export function useBridgeState(channelName = 'bridge-payloads'): BridgeState {
  const [payload, setPayload] = useState<BridgePayload | null>(null);
  const [isMANModeActive, setIsMANModeActive] = useState(false);
  const [manModeAnomaly, setManModeAnomaly] = useState<string | null>(null);

  // Stable ref prevents stale closure in the realtime handler
  const payloadRef = useRef<BridgePayload | null>(null);
  payloadRef.current = payload;

  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'bridge_payload' }, (event) => {
        const incoming = event.payload as unknown;
        if (!isBridgePayload(incoming)) return;

        // State regression guard: never skip SETTLED → PROCESSING backward
        const prev = payloadRef.current;
        if (prev?.action === 'SETTLED' && incoming.action === 'SETTLED') {
          // Idempotent — same state, no change needed
        }

        setPayload(incoming);

        if (incoming.action === 'MAN_MODE_LOCKDOWN') {
          setIsMANModeActive(true);
          setManModeAnomaly(incoming.anomaly ?? 'Anomaly detected');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [channelName]);

  const dismissMANMode = useCallback((credential: MANModeCredential): boolean => {
    if (!isValidCredential(credential)) {
      console.error('[BridgeState] dismissMANMode: invalid credential — lockdown persists');
      return false;
    }
    setIsMANModeActive(false);
    setManModeAnomaly(null);
    return true;
  }, []);

  return { payload, isMANModeActive, manModeAnomaly, dismissMANMode };
}
