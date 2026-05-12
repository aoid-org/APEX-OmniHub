import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasSupabaseConfig, supabase, supabaseConfigTraceId } from '@/lib/supabase';
import { isDemoAuthActive } from '@/lib/demoAuth';

export function ProtectedRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    async function checkAuth() {
      if (isDemoAuthActive()) {
        setAuthenticated(true);
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      setAuthenticated(!!session);
      setLoading(false);
    }

    checkAuth();

    if (isDemoAuthActive()) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [location.search]);

  // Handle immediate demo override so we never show loading state briefly and get caught
  // without authenticated=true on first pass if checkAuth hasn't finished yet
  const isDemo = isDemoAuthActive();

  if (isDemo) {
      return <>{children}</>;
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#030303',
          color: '#ffffff',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        Loading...
      </div>
    );
  }

  if (!hasSupabaseConfig && !isDemo) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          backgroundColor: '#030303',
          color: '#ffffff',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Service unavailable</h1>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#d4d4d8' }}>
            Supabase environment configuration is missing.
          </p>
          <p style={{ marginTop: '4px', fontSize: '12px', color: '#a1a1aa' }}>
            Trace: {supabaseConfigTraceId}
          </p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
