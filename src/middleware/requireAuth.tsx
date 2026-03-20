/**
 * requireAuth — Higher-order function for wrapping components with auth protection.
 *
 * Separated from authGuard.tsx to satisfy react-refresh/only-export-components.
 *
 * @module middleware/requireAuth
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { type ComponentType } from 'react';
import { AuthGuard } from './authGuard';

/**
 * requireAuth — HOF that wraps a React component with auth protection.
 * Returns a new component that renders the original only when authenticated.
 *
 * Usage:
 * ```tsx
 * const ProtectedDashboard = requireAuth(DashboardPage);
 * // or with options:
 * const AdminOnly = requireAuth(AdminPanel, { requiredRole: 'admin' });
 * ```
 */
export function requireAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options?: {
    requiredRole?: string;
    redirectTo?: string;
  },
): ComponentType<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function WithAuth(props: P) {
    return (
      <AuthGuard
        requiredRole={options?.requiredRole}
        redirectTo={options?.redirectTo}
      >
        <WrappedComponent {...props} />
      </AuthGuard>
    );
  }

  WithAuth.displayName = `requireAuth(${displayName})`;
  return WithAuth;
}
