/**
 * useOmniDashAction — Universal OmniDash Interaction Interceptor
 * @version 1.0.0
 * @module apps/omnihub-site/src/hooks/useOmniDashAction
 *
 * Binds to all app interaction triggers within OmniDash and formats user
 * intent into strict OmniModalConfig objects. Handles:
 *  - New connections: type 'oauth' with zero-config proxy exchange
 *  - Installed app launches: type 'microfrontend' or 'spatial' based on payload
 *  - Notification/utility modals: type 'selection', 'confirmation', etc.
 *
 * The onComplete callback for OAuth flows executes the secure backend
 * proxy token exchange, then hydrates OmniBoard global state.
 *
 * APEX STANDARDS ENFORCED:
 * - Zero-Config Onboarding: User never sees or touches an API key
 * - Deterministic: No stacking modals, no unhandled promise rejections on abort
 * - Atomic Idempotency: Same intent always produces identical OmniModalConfig
 * - Regression-Free: ABORTED states absorbed silently via onCancel
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOmniModal, type ModalType, type RenderMode } from '../../../../src/stores/omniModalStore';
import { useOmniBoard, type SpatialRenderState } from '../../../../src/stores/omniBoardStore';

// ============================================================================
// Types
// ============================================================================

interface AppIntent {
  readonly id: string;
  readonly provider: string;
  readonly category: string;
  readonly status: string;
  readonly appType?: 'media' | 'editor' | 'terminal' | 'microfrontend';
  readonly entryUrl?: string;
  readonly contextData?: Record<string, unknown>;
}

interface UtilityModalIntent {
  readonly id: string;
  readonly provider: string;
  readonly type: ModalType;
  readonly title: string;
  readonly description?: string;
  readonly schema?: Record<string, unknown>;
  readonly contextData?: Record<string, unknown>;
  readonly renderMode?: RenderMode;
  readonly onComplete?: (data: Record<string, unknown>) => Promise<void>;
  readonly onCancel?: () => void;
}

interface UseOmniDashActionReturn {
  readonly handleAppInteraction: (app: AppIntent) => void;
  readonly handleUtilityModal: (intent: UtilityModalIntent) => void;
  readonly handleOAuthConnect: (provider: string, category: string) => void;
  readonly handleAppLaunch: (app: AppIntent) => void;
}

// ============================================================================
// Proxy Token Exchange — Zero-Config Backend Flow
// ============================================================================

async function executeProxyExchange(
  provider: string,
  proxyToken: string,
  context: Record<string, unknown>,
): Promise<{ scopes: string[]; data: Record<string, unknown> }> {
  // The proxy exchange is handled entirely server-side.
  // The frontend sends the proxy token received from the OAuth consent screen
  // to our backend, which performs the actual client_secret exchange.
  // This ensures NO secrets are ever exposed to the client.
  const response = await fetch('/api/omniconnect/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      proxy_token: proxyToken,
      context,
    }),
  });

  if (!response.ok) {
    throw new Error(`[OmniDash] Proxy exchange failed: ${response.status}`);
  }

  return response.json() as Promise<{ scopes: string[]; data: Record<string, unknown> }>;
}

// ============================================================================
// Hook
// ============================================================================

export function useOmniDashAction(): UseOmniDashActionReturn {
  const navigate = useNavigate();
  const omniModal = useOmniModal();
  const omniBoard = useOmniBoard();

  /**
   * OAuth connect flow — zero-config onboarding.
   * Invokes an OAuth modal, captures the proxy token on consent,
   * executes the backend exchange, and hydrates OmniBoard.
   */
  const handleOAuthConnect = useCallback((provider: string, category: string) => {
    omniModal.invoke({
      id: `auth-${provider.toLowerCase().replaceAll(/\s+/g, '-')}`,
      provider,
      type: 'oauth',
      title: `${provider} Authorization`,
      description: `Connect APEX OmniHub to ${provider} to sync ${category} data seamlessly.`,

      onComplete: async (data: Record<string, unknown>) => {
        const proxyToken = data.proxy_token as string | undefined;
        if (!proxyToken) {
          // Direct consent without token exchange (e.g. demo/sim mode)
          omniBoard.hydrateIntegration({
            provider,
            data: structuredClone(data),
            scopes: [],
          });
          return;
        }

        // Execute secure backend proxy exchange
        const result = await executeProxyExchange(
          provider,
          proxyToken,
          (data.context as Record<string, unknown>) ?? {},
        );

        // Hydrate OmniBoard with sanitized integration data
        omniBoard.hydrateIntegration({
          provider,
          data: structuredClone(result.data),
          scopes: result.scopes,
        });
      },

      onCancel: () => {
        // Absorb ABORTED state cleanly — no UI errors
        console.warn(`[OmniDash] ${provider} authorization dismissed by user.`);
      },
    });
  }, [omniModal, omniBoard]);

  /**
   * App launch flow — for installed/live apps.
   * Determines render mode from app payload and mounts via OmniBoard + OmniSpatialHost.
   */
  const handleAppLaunch = useCallback((app: AppIntent) => {
    const appType = app.appType ?? 'microfrontend';

    // Determine modal type and render state
    const modalType: ModalType = 'microfrontend';
    const renderState: SpatialRenderState =
      (appType === 'media' || appType === 'editor' || appType === 'terminal')
        ? 'spatial'
        : 'sandbox';

    // Mount the active app in OmniBoard state
    omniBoard.mountActiveApp({
      id: app.id,
      provider: app.provider,
      renderState,
      payload: {
        category: app.category,
        appType,
        entryUrl: app.entryUrl,
        ...app.contextData,
      },
    });

    // Invoke OmniSpatialHost via the modal store
    omniModal.invoke({
      id: `app-${app.id}`,
      provider: app.provider,
      type: modalType,
      title: app.provider,
      description: `${app.provider} — ${app.category}`,
      renderMode: renderState === 'spatial' ? 'spatial' : 'sandbox',
      contextData: {
        appType,
        entryUrl: app.entryUrl,
        ...app.contextData,
      },

      onComplete: async (data: Record<string, unknown>) => {
        // App interaction completed — update OmniBoard payload
        const currentApp = useOmniBoard.getState().activeApp;
        if (currentApp?.id === app.id) {
          omniBoard.mountActiveApp({
            id: app.id,
            provider: app.provider,
            renderState: currentApp.renderState,
            payload: { ...currentApp.payload, ...data },
          });
        }
      },

      onCancel: () => {
        // Clean teardown — clear active app on user dismissal
        omniBoard.clearActiveApp();
      },
    });
  }, [omniModal, omniBoard]);

  /**
   * Universal app interaction handler — the primary entry point.
   * Routes to OAuth connect or app launch based on app status.
   */
  const handleAppInteraction = useCallback((app: AppIntent) => {
    if (app.status === 'Partial') {
      // Unconnected integration — trigger OAuth
      handleOAuthConnect(app.provider, app.category);
    } else if (app.appType && app.appType !== 'microfrontend') {
      // Spatial app — launch in spatial/sandbox mode
      handleAppLaunch(app);
    } else {
      // Standard navigation for fully connected apps
      navigate(`/omnidash/${app.id}`);
    }
  }, [navigate, handleOAuthConnect, handleAppLaunch]);

  /**
   * Generic utility modal — for notifications, confirmations, etc.
   * Passes through to OmniModal with optional custom handlers.
   */
  const handleUtilityModal = useCallback((intent: UtilityModalIntent) => {
    omniModal.invoke({
      id: intent.id,
      provider: intent.provider,
      type: intent.type,
      title: intent.title,
      description: intent.description,
      schema: intent.schema,
      contextData: intent.contextData,
      renderMode: intent.renderMode,

      onComplete: intent.onComplete ?? (async () => { /* noop */ }),

      onCancel: intent.onCancel ?? (() => {
        // Default: absorb dismissal silently
      }),
    });
  }, [omniModal]);

  return useMemo(() => ({
    handleAppInteraction,
    handleUtilityModal,
    handleOAuthConnect,
    handleAppLaunch,
  }), [handleAppInteraction, handleUtilityModal, handleOAuthConnect, handleAppLaunch]);
}
