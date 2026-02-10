/**
 * useLoginRedirect Hook
 *
 * Handles post-login routing with deep-link preservation.
 * Waits for admin and paid access data to load, then routes deterministically.
 *
 * Usage:
 * ```tsx
 * const { redirect, loading } = useLoginRedirect();
 *
 * useEffect(() => {
 *   if (session && !loading) {
 *     redirect();
 *   }
 * }, [session, loading, redirect]);
 * ```
 */

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';
import { useAdminAccess } from '@/omnidash/hooks';
import { usePaidAccess } from '@/hooks/usePaidAccess';
import { getPostLoginDestination } from '@/utils/postLoginRouter';

export interface UseLoginRedirectReturn {
  /** Navigate to appropriate post-login destination */
  redirect: () => void;
  /** True if still loading access data */
  loading: boolean;
  /** Intended destination from URL params */
  intendedDestination: string | null;
}

/**
 * Hook for deterministic post-login routing
 *
 * Checks admin and paid access, then routes to:
 * 1. Intended destination (if accessible)
 * 2. /omnidash (if admin)
 * 3. /dashboard (if paid)
 * 4. /omnidash (demo for free users)
 */
export function useLoginRedirect(): UseLoginRedirectReturn {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const { isPaid, tier, loading: paidLoading } = usePaidAccess();

  const intendedDestination = searchParams.get('redirect');
  const loading = adminLoading || paidLoading;

  const redirect = useCallback(() => {
    if (loading) {
      // Don't route until we know access levels
      console.warn('useLoginRedirect: Called redirect() while still loading access data');
      return;
    }

    const destination = getPostLoginDestination({
      isAdmin,
      isPaid,
      tier,
      intendedDestination,
    });

    navigate(destination, { replace: true });
  }, [loading, isAdmin, isPaid, tier, intendedDestination, navigate]);

  return {
    redirect,
    loading,
    intendedDestination,
  };
}
