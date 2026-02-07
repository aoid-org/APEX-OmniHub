import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchSettings, updateSettings } from './api';
import { OMNIDASH_ADMIN_ALLOWLIST, OMNIDASH_FLAG, OmniDashSettings } from './types';

/**
 * Shared hook for authenticated OmniDash queries.
 * Eliminates duplicated useAuth + enabled + user-guard boilerplate.
 */
export function useOmniQuery<T>(
  keyPrefix: string,
  queryFn: (userId: string) => Promise<T>,
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [keyPrefix, user?.id] as QueryKey,
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('User required');
      return queryFn(user.id);
    },
  });
}

/**
 * Shared hook for authenticated OmniDash mutations with auto-invalidation.
 */
export function useOmniMutation<TArgs = void>(
  invalidateKey: string,
  mutationFn: (userId: string, args: TArgs) => Promise<void>,
  opts?: { onSuccess?: () => void },
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: TArgs) => {
      if (!user) throw new Error('User required');
      return mutationFn(user.id, args);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invalidateKey, user?.id] });
      opts?.onSuccess?.();
    },
  });
}

export function useAdminAccess() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['omnidash-role', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;

      // PRIORITY 1: Check allowlist (instant, no DB query)
      // Allowlist bypasses all other checks for designated admin emails
      const allowlistHit = OMNIDASH_ADMIN_ALLOWLIST.includes((user.email || '').toLowerCase());
      if (allowlistHit) return true;

      // PRIORITY 2: Check user_roles table (primary source of truth)
      // This is what RLS policies use, so must be consistent
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) throw roleError;
      if (roleData?.role === 'admin') return true;

      // PRIORITY 3: Check app_metadata as fallback (edge case recovery)
      // Handles scenario where trigger failed or user granted admin externally
      // Note: This should rarely be needed due to trigger auto-sync
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        // If getUser fails, don't throw - just treat as non-admin
        console.warn('useAdminAccess: Failed to fetch user metadata', authError);
        return false;
      }

      const appMetaAdmin = authData.user?.app_metadata?.admin === true;
      if (appMetaAdmin) {
        // Log this case - indicates trigger may not have fired
        console.warn('useAdminAccess: User has app_metadata.admin but no user_roles entry (trigger lag?)');
        return true;
      }

      // No admin access found in any system
      return false;
    },
    staleTime: 5 * 60 * 1000, // 5 minute cache (balance freshness vs performance)
    retry: 1, // Retry once on failure (network flakiness)
  });

  return {
    isAdmin: !!data,
    loading: isLoading,
    error,
    featureEnabled: OMNIDASH_FLAG,
  };
}

export function useOmniDashSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<OmniDashSettings>({
    queryKey: ['omnidash-settings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('User not found');
      return fetchSettings(user.id);
    },
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<OmniDashSettings>) => {
      if (!user) throw new Error('User not found');
      return updateSettings(user.id, patch);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['omnidash-settings', user?.id], data);
    },
  });

  return { ...query, updateSettings: mutation.mutateAsync, updating: mutation.isPending };
}

