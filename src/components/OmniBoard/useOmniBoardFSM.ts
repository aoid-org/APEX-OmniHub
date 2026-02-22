/**
 * useOmniBoardFSM — Client-side Finite State Machine for OmniBoard
 * Mirrors orchestrator/omniboard/fsm.py + schema.py
 *
 * Connect-only onboarding engine:
 * IDLE_LISTEN → APP_IDENTIFICATION → AUTH_SETUP → AUTH_COMPLETE →
 * VERIFY_CONNECTION → REGISTER_CONNECTION → COMPLETION
 */

import { useState, useCallback } from 'react';
import { availableIntegrations, type IntegrationDef } from '@/omniconnect/core/registry';

export type OmniBoardState =
  | 'IDLE_LISTEN'
  | 'APP_IDENTIFICATION'
  | 'APP_DISAMBIGUATION'
  | 'AUTH_SETUP'
  | 'AUTH_COMPLETE'
  | 'VERIFY_CONNECTION'
  | 'REGISTER_CONNECTION'
  | 'COMPLETION'
  | 'RECOVERY_RETRY';

export type AuthType = 'oauth' | 'api_key' | 'device_code';

export interface ConnectionSpec {
  omniboard_version: string;
  tenant_id: string;
  connection: {
    connection_id: string;
    provider_name: string;
    provider_hint: string;
    match_confidence: number;
    auth_type: AuthType;
    token_ref: string;
    verified: boolean;
    verification_method: string;
    connected_at: string;
  };
  security: {
    guardian_profile: string;
    triforce_tier: string;
    risk_flags: string[];
  };
  audit: {
    trace_id: string;
    created_at: string;
  };
}

export interface OmniBoardContext {
  sessionId: string;
  state: OmniBoardState;
  selectedApp: IntegrationDef | null;
  providerHint: string;
  candidates: IntegrationDef[];
  authType: AuthType | null;
  retryCount: number;
  connectionSpec: ConnectionSpec | null;
  message: string;
}

function generateId(): string {
  return `conn_${crypto.randomUUID()}`;
}

function fuzzyMatch(query: string): IntegrationDef[] {
  if (!query.trim()) return availableIntegrations;
  const q = query.toLowerCase();
  return availableIntegrations.filter(
    (i) =>
      i.name.toLowerCase().includes(q) ||
      i.type.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q)
  );
}

function createInitialContext(): OmniBoardContext {
  return {
    sessionId: crypto.randomUUID(),
    state: 'IDLE_LISTEN',
    selectedApp: null,
    providerHint: '',
    candidates: availableIntegrations,
    authType: null,
    retryCount: 0,
    connectionSpec: null,
    message: 'Which app would you like to connect?',
  };
}

export function useOmniBoardFSM() {
  const [ctx, setCtx] = useState<OmniBoardContext>(createInitialContext);

  const searchApps = useCallback((query: string) => {
    setCtx((prev) => ({
      ...prev,
      providerHint: query,
      candidates: fuzzyMatch(query),
    }));
  }, []);

  const selectApp = useCallback((app: IntegrationDef) => {
    setCtx((prev) => ({
      ...prev,
      state: 'AUTH_SETUP',
      selectedApp: app,
      message: `Connect ${app.name}. Choose your authentication method.`,
    }));
  }, []);

  const selectAuthMethod = useCallback((method: AuthType) => {
    setCtx((prev) => ({
      ...prev,
      state: 'AUTH_COMPLETE',
      authType: method,
      message:
        method === 'oauth'
          ? 'Redirecting to provider authorization...'
          : method === 'api_key'
            ? 'Enter your API key to continue.'
            : 'Enter the device code shown on your device.',
    }));
  }, []);

  const submitCredentials = useCallback((_credentials: string) => {
    setCtx((prev) => ({
      ...prev,
      state: 'VERIFY_CONNECTION',
      message: 'Verifying connection...',
    }));

    // Simulate verification (1.5s) then registration (0.5s)
    setTimeout(() => {
      setCtx((prev) => ({
        ...prev,
        state: 'REGISTER_CONNECTION',
        message: 'Connection verified. Registering with OmniPort...',
      }));

      setTimeout(() => {
        setCtx((prev) => {
          const spec: ConnectionSpec = {
            omniboard_version: '1.0',
            tenant_id: prev.sessionId,
            connection: {
              connection_id: generateId(),
              provider_name: prev.selectedApp?.name ?? 'Unknown',
              provider_hint: prev.providerHint,
              match_confidence: 1.0,
              auth_type: prev.authType ?? 'api_key',
              token_ref: `vault://${prev.sessionId}/${prev.selectedApp?.type}/token`,
              verified: true,
              verification_method: 'safe_ping',
              connected_at: new Date().toISOString(),
            },
            security: {
              guardian_profile: 'default',
              triforce_tier: 'standard',
              risk_flags: [],
            },
            audit: {
              trace_id: prev.sessionId,
              created_at: new Date().toISOString(),
            },
          };
          return {
            ...prev,
            state: 'COMPLETION',
            connectionSpec: spec,
            message: `${prev.selectedApp?.name} is now connected.`,
          };
        });
      }, 500);
    }, 1500);
  }, []);

  const reset = useCallback(() => {
    setCtx(createInitialContext());
  }, []);

  const uiStep = (() => {
    switch (ctx.state) {
      case 'IDLE_LISTEN':
      case 'APP_IDENTIFICATION':
      case 'APP_DISAMBIGUATION':
        return 0;
      case 'AUTH_SETUP':
      case 'AUTH_COMPLETE':
        return 1;
      case 'VERIFY_CONNECTION':
      case 'REGISTER_CONNECTION':
        return 2;
      case 'COMPLETION':
        return 3;
      case 'RECOVERY_RETRY':
        return 0;
    }
  })();

  return {
    ctx,
    uiStep,
    searchApps,
    selectApp,
    selectAuthMethod,
    submitCredentials,
    reset,
  };
}
