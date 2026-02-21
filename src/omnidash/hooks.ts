import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchSettings, updateSettings } from './api';
import { OMNIDASH_FLAG, OmniDashSettings } from './types';

export function useAdminAccess() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['omnidash-role', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;

      // DB-only: Check user_roles table (single source of truth, matches RLS is_admin())
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) throw roleError;
      return roleData?.role === 'admin';
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
