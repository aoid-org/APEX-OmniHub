import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function ProtectedRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthenticated(!!session);
      setLoading(false);
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center">Loading...</div>;
  }

  if (!authenticated) {
    // For now, redirect to login, or just allow access if we are in dev/demo mode?
    // The prompt says "The user pays to flip the status to ACTIVE" and then redirects to /omnidash.
    // If we strictly require auth, the user might get stuck if not logged in.
    // But let's assume standard behavior.
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
