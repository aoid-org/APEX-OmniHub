/**
 * AccessGate - Fail-Closed Access Control Component
 * 
 * Wraps every routed page to enforce NO GHOST FEATURES.
 * If a feature is not in the registry or is locked, it shows LockedFeaturePanel.
 * 
 * @example
 * <AccessGate featureId="omnidash.tasks">
 *   <TasksPage />
 * </AccessGate>
 */

import React from 'react';
import { getFeature, isFeatureAccessible, type Feature } from '@/features/registry';
import { useAccessMode } from '@/contexts/AccessContext';
import { LockedFeaturePanel } from './LockedFeaturePanel';

interface AccessGateProps {
  readonly featureId: string;
  readonly children: React.ReactNode;
  /** Override for public routes that don't need registry lookup */
  readonly bypassForPublic?: boolean;
}

export const AccessGate: React.FC<AccessGateProps> = ({
  featureId,
  children,
  bypassForPublic = false,
}) => {
  const { isDemo, isAuthenticated } = useAccessMode();

  // Bypass check for explicitly public routes
  if (bypassForPublic) {
    return <>{children}</>;
  }

  // FAIL-CLOSED: Feature must exist in registry
  const feature = getFeature(featureId);
  if (!feature) {
    return (
      <LockedFeaturePanel
        featureId={featureId}
        title="Unknown Feature"
        reason="This feature is not registered in the system (fail-closed security)."
        showLogin={false}
      />
    );
  }

  // Check accessibility based on current mode
  const { accessible, reason } = isFeatureAccessible(featureId, isDemo, isAuthenticated);

  if (!accessible) {
    return (
      <LockedFeaturePanel
        featureId={featureId}
        title={feature.title}
        reason={reason}
        showLogin={!isAuthenticated && feature.status === 'authOnly'}
        showExploreDemo={!isDemo && feature.modeBehavior.demo !== 'lock'}
      />
    );
  }

  return <>{children}</>;
};

/**
 * Higher-order component version for route wrappers
 */
export function withAccessGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureId: string
): React.FC<P> {
  const WithAccessGate: React.FC<P> = (props) => (
    <AccessGate featureId={featureId}>
      <WrappedComponent {...props} />
    </AccessGate>
  );

  WithAccessGate.displayName = `WithAccessGate(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithAccessGate;
}

export default AccessGate;
