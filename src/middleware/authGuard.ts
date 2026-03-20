/**
 * Auth Guard — Route Protection Middleware
 *
 * Provides React Router-compatible route guards that intercept
 * unauthenticated navigation and redirect to login.
 *
 * Uses the AuthContext (useAuth) as the single source of truth for
 * session state, consistent with OmniDash patterns (see useAdminAccess).
 *
 * APEX STANDARDS:
 * - Zero-trust: All protected routes require verified Supabase session
 * - Fail-closed: Missing session = immediate redirect to login
 * - Idempotent: Same auth state always produces same routing decision
 *
 * @module middleware/authGuard
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { type ReactNode, type ComponentType, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthGuardProps {
  readonly children: ReactNode;
  /** Required role (e.g., 'admin'). If omitted, any authenticated user passes. */
  readonly requiredRole?: string;
  /** Redirect path on auth failure. Defaults to '/auth'. */
  readonly redirectTo?: string;
}

interface ProtectedRouteProps {
  readonly children: ReactNode;
  /** Required role (e.g., 'admin'). If omitted, any authenticated user passes. */
  readonly requiredRole?: string;
  /** Redirect path on auth failure. Defaults to '/auth'. */
  readonly redirectTo?: string;
  /** Fallback to render while auth state is loading. Defaults to null (blank). */
  readonly fallback?: ReactNode;
}

// ---------------------------------------------------------------------------
// AuthGuard — HOC wrapper component
// ---------------------------------------------------------------------------

/**
 * AuthGuard — Wraps protected routes with Supabase session verification.
 * Uses useAuth() from AuthContext as the single source of truth.
 *
 * Usage:
 * ```tsx
 * <Route path="/omnidash" element={
 *   <AuthGuard requiredRole="admin">
 *     <OmniDashShell />
 *   </AuthGuard>
 * } />
 * ```
 */
export function AuthGuard({
  children,
  requiredRole,
  redirectTo = '/auth',
}: AuthGuardProps): ReactNode {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();

  const isAuthenticated = !!user && !!session;
  const hasRequiredRole = requiredRole
    ? (user?.app_metadata?.role as string | undefined) === requiredRole
    : true;
  const isAuthorized = isAuthenticated && hasRequiredRole;

  useEffect(() => {
    if (!loading && !isAuthorized) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, isAuthorized, navigate, redirectTo]);

  // While auth state is resolving, render nothing to prevent flash
  if (loading) return null;

  // Only render children when fully authorized
  if (isAuthorized) return children;

  // Redirect is in-flight; render nothing
  return null;
}

// ---------------------------------------------------------------------------
// ProtectedRoute — Wrapper component with fallback support
// ---------------------------------------------------------------------------

/**
 * ProtectedRoute — Wraps children with an auth check.
 * Similar to AuthGuard but supports a custom loading fallback.
 *
 * Usage:
 * ```tsx
 * <ProtectedRoute fallback={<LoadingSkeleton />}>
 *   <DashboardPage />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/auth',
  fallback = null,
}: ProtectedRouteProps): ReactNode {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();

  const isAuthenticated = !!user && !!session;
  const hasRequiredRole = requiredRole
    ? (user?.app_metadata?.role as string | undefined) === requiredRole
    : true;
  const isAuthorized = isAuthenticated && hasRequiredRole;

  useEffect(() => {
    if (!loading && !isAuthorized) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, isAuthorized, navigate, redirectTo]);

  if (loading) return fallback;
  if (isAuthorized) return children;
  return null;
}

// ---------------------------------------------------------------------------
// requireAuth — Higher-order function for wrapping route loaders
// ---------------------------------------------------------------------------

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
