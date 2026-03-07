/**
 * useOmniDashAction — Unified action dispatcher for OmniDash
 * @version 3.0.0
 *
 * Provides two consumption patterns:
 *   1. Layout usage  → useOmniDashAction()   → { handleOAuthConnect, handleUtilityModal, handleAppLaunch, handleAppInteraction }
 *   2. Dashboard usage → useOmniDashAction(navigate) → { dispatch }
 *
 * Deterministic: same intent always produces identical OmniModalConfig.
 * Regression-Free: ABORTED states absorbed silently via onCancel.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useCallback, useMemo } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { useOmniModal, type ModalType, type RenderMode } from '../../../../src/stores/omniModalStore';
import { useOmniBoard, type SpatialRenderState } from '../../../../src/stores/omniBoardStore';
import { hasModuleComponent } from '../components/omnidash/moduleComponents';

// ============================================================================
// Types
// ============================================================================

export interface OmniDashIntent {
  readonly appKey: string;
  readonly provider: string;
  readonly label: string;
  readonly category: string;
  readonly routePath: string;
  readonly dashboardStatus: string;
  readonly comingSoon?: boolean;
}

interface AppIntent {
  readonly id: string;
  readonly provider: string;
  readonly category: string;
  readonly status: 'Live' | 'Partial' | string;
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
  readonly dispatch: (intent: OmniDashIntent) => void;
}

// ============================================================================
// Proxy Token Exchange — Zero-Config Backend Flow
// ============================================================================

async function executeProxyExchange(
  provider: string,
  proxyToken: string,
  context: Record<string, unknown>,
): Promise<{ scopes: string[]; data: Record<string, unknown> }> {
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
// Hook — supports both overload patterns
// ============================================================================

export function useOmniDashAction(externalNavigate?: NavigateFunction): UseOmniDashActionReturn {
  const internalNavigate = useNavigate();
  const navigate = externalNavigate ?? internalNavigate;
  const omniModal = useOmniModal();
  const omniBoard = useOmniBoard();

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
          omniBoard.hydrateIntegration({
            provider,
            data: structuredClone(data),
            scopes: [],
          });
          return;
        }

        const result = await executeProxyExchange(
          provider,
          proxyToken,
          (data.context as Record<string, unknown>) ?? {},
        );

        omniBoard.hydrateIntegration({
          provider,
          data: structuredClone(result.data),
          scopes: result.scopes,
        });
      },

      onCancel: () => {
        console.warn(`[OmniDash] ${provider} authorization dismissed by user.`);
      },
    });
  }, [omniModal, omniBoard]);

  const handleAppLaunch = useCallback((app: AppIntent) => {
    const appType = app.appType ?? 'microfrontend';

    const modalType: ModalType = 'microfrontend';
    const renderState: SpatialRenderState =
      (appType === 'media' || appType === 'editor' || appType === 'terminal')
        ? 'spatial'
        : 'sandbox';

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
        omniBoard.clearActiveApp();
      },
    });
  }, [omniModal, omniBoard]);

  const handleAppInteraction = useCallback((app: AppIntent) => {
    if (app.status === 'Partial') {
      handleOAuthConnect(app.provider, app.category);
    } else if (app.appType && app.appType !== 'microfrontend') {
      handleAppLaunch(app);
    } else {
      navigate(`/omnidash/${app.id}`);
    }
  }, [navigate, handleOAuthConnect, handleAppLaunch]);

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

  /**
   * Dispatch — used by modularized DashboardOverview.
   * Translates OmniDashIntent into the appropriate navigation or modal action.
   */
  const dispatch = useCallback((intent: OmniDashIntent) => {
    if (intent.dashboardStatus === 'Partial') {
      handleOAuthConnect(intent.provider, intent.category);
      return;
    }

    // Modules with a lazy-loaded component open in a functional modal panel
    if (hasModuleComponent(intent.appKey)) {
      omniModal.invoke({
        id: `module-${intent.appKey}`,
        provider: intent.provider,
        type: 'module',
        title: intent.label,
        description: `${intent.label} \u2014 ${intent.category}`,
        contextData: {
          moduleKey: intent.appKey,
          category: intent.category,
        },
        onComplete: async (data: Record<string, unknown>) => {
          if (typeof data.action === 'string') {
            console.warn(
              `[OmniDash] Module action: ${data.action}`,
              data,
            );
          }
        },
        onCancel: () => { /* user dismissed */ },
      });
    } else {
      navigate(intent.routePath);
    }
  }, [navigate, handleOAuthConnect, omniModal]);

  return useMemo(() => ({
    handleAppInteraction,
    handleUtilityModal,
    handleOAuthConnect,
    handleAppLaunch,
    dispatch,
  }), [handleAppInteraction, handleUtilityModal, handleOAuthConnect, handleAppLaunch, dispatch]);
}
