/**
 * AccessGate - Fail-closed access control component
 * 
 * Renders children ONLY if user has required scopes.
 * Otherwise renders fallback (default: null).
 * 
 * FAIL-CLOSED: If context is missing or scopes can't be verified,
 * access is DENIED.
 */

import { type ReactNode, memo } from 'react';
import type { AccessScope } from '@/features/registry';
import { useAccess } from '@/contexts/AccessContext';

interface AccessGateProps {
  readonly requiredScopes: readonly AccessScope[];
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}

export const AccessGate = memo(function AccessGate({
  requiredScopes,
  children,
  fallback = null,
}: AccessGateProps) {
  const { userScopes, isDemo } = useAccess();

  // FAIL-CLOSED: Check all required scopes
  const hasAccess = requiredScopes.every((scope) => {
    // Public routes are always accessible
    if (scope === 'public') return true;
    // Demo mode grants demo scope
    if (scope === 'demo' && isDemo) return true;
    // Check user scopes
    return userScopes.includes(scope);
  });

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
});

AccessGate.displayName = 'AccessGate';

/**
 * RequireAuth - Shorthand for authenticated-only content
 */
export const RequireAuth = memo(function RequireAuth({
  children,
  fallback,
}: {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}) {
  return (
    <AccessGate requiredScopes={['authenticated']} fallback={fallback}>
      {children}
    </AccessGate>
  );
});

RequireAuth.displayName = 'RequireAuth';

/**
 * RequireAdmin - Shorthand for admin-only content
 */
export const RequireAdmin = memo(function RequireAdmin({
  children,
  fallback,
}: {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}) {
  return (
    <AccessGate requiredScopes={['admin']} fallback={fallback}>
      {children}
    </AccessGate>
  );
});

RequireAdmin.displayName = 'RequireAdmin';
