/**
 * apps/omnihub-site/src/omniconnect/core/registry.ts
 * Re-export shim — the canonical implementation lives at src/omniconnect/core/registry.ts
 * and is aliased as @omniconnect in vite.config.ts.
 *
 * This file makes `@/omniconnect/core/registry` resolve correctly inside the
 * omnihub-site app without changing OmniBoard.tsx or IntegrationOnboarder.tsx
 * import paths.
 */
export type { IntegrationDef } from '@omniconnect/core/registry';
export {
  availableIntegrations,
  connectorRegistry,
  registerConnector,
  getConnector,
  hasConnector,
  listConnectors,
} from '@omniconnect/core/registry';
