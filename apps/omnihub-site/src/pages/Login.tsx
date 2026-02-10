import { useState, FormEvent, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Section } from '@/components/Section';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL ?? '/omnidash';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [configMissing, setConfigMissing] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setConfigMissing(true);
      return;
    }

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          // Use window location to ensure a full refresh and state reset
          console.log('Session found, redirecting to:', dashboardUrl);
          window.location.replace(dashboardUrl);
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasSupabaseConfig) {
      setError('System configuration error: Auth service unavailable.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        // Human-readable error mapping
        if (authError.message === 'Invalid login credentials') {
          setError('Invalid email or password. Please try again.');
        } else {
          setError(authError.message);
        }
        return;
      }

      // Successful login - redirect
      console.log('Login successful, redirecting to:', dashboardUrl);
      window.location.replace(dashboardUrl);
    } catch (err) {
      setError('An unexpected network error occurred.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    globalThis.window.location.reload();
  };

  // Expose signOut for external use
  if (typeof globalThis !== 'undefined') {
    (window as any).__omnihubSignOut = handleSignOut;
  }

  return (
    <Layout title="Log In">
      <Section variant="surface" className="flex items-center justify-center min-h-[60vh]">
        <div style={{ textAlign: 'center', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, var(--color-accent) 0%, #c4571c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-6)',
              boxShadow: '0 8px 32px rgba(234, 88, 12, 0.3), 0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
                fill="rgba(255,255,255,0.15)"
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <rect x="10" y="10" width="4" height="5" rx="0.5" fill="white" />
              <circle cx="12" cy="8.5" r="2" stroke="white" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          <h1 className="heading-2">Welcome Back</h1>
          <p className="text-secondary mt-2">Sign in to your APEX OmniHub account</p>

          {configMissing && (
             <div style={{ 
               padding: '1rem', 
               backgroundColor: 'var(--color-surface)', 
               border: '1px solid var(--color-error)', 
               borderRadius: 'var(--border-radius-md)',
               marginTop: '1rem',
               color: 'var(--color-error)',
               fontSize: 'var(--font-size-sm)'
             }}>
               <strong>Configuration Error:</strong><br/>
               Missing Supabase connection details.<br/>
               Please check VITE_SUPABASE_URL in .env
             </div>
          )}

          <form onSubmit={handleSubmit} style={{ marginTop: 'var(--space-8)' }}>
            <div className="form-group">
              <label htmlFor="email" className="form-label" style={{textAlign: 'left'}}>
                Email
              </label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isLoading || configMissing}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label" style={{textAlign: 'left'}}>
                Password
              </label>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isLoading || configMissing}
              />
            </div>

            {error && (
              <p className="form-error" style={{ marginBottom: 'var(--space-4)', color: 'var(--color-error)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn--primary btn--lg"
              style={{ width: '100%', opacity: isLoading ? 0.7 : 1 }}
              disabled={isLoading || configMissing}
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{
                    width: '16px', 
                    height: '16px', 
                    border: '2px solid rgba(255,255,255,0.3)', 
                    borderTopColor: '#fff', 
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px'
                  }}/>
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          
          <p className="text-muted mt-8" style={{ fontSize: 'var(--font-size-sm)', marginTop: '2rem' }}>
            Don&apos;t have an account?{' '}
            <a href="/request-access.html" style={{ color: 'var(--color-accent)' }}>
              Request Access
            </a>
          </p>
        </div>
      </Section>
    </Layout>
  );
}
