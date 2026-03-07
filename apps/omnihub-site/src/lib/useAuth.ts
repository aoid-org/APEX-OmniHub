import { useState, useEffect } from 'react';
import { supabase, hasSupabaseConfig } from './supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * Lightweight auth hook wrapping the existing supabase.auth API.
 * Returns session state for auth-aware UI rendering.
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading, isAuthenticated: !!session };
}
