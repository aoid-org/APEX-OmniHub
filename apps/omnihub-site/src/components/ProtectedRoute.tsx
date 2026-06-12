import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { hasSupabaseConfig, supabase, supabaseConfigTraceId } from '@/lib/supabase';

export function ProtectedRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          setAuthenticated(false);
        } else {
          setAuthenticated(!!session);
        }
      } catch {
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  if (!hasSupabaseConfig) {
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
