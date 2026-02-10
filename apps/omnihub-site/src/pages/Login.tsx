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


  useEffect(() => {
    if (!hasSupabaseConfig) {
      return;
    }

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        // Use window location to ensure a full refresh and state reset
        window.location.replace(dashboardUrl);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasSupabaseConfig) {
      setError('Login is temporarily unavailable. Please contact support.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Human-readable error mapping
        if (authError.message === 'Invalid login credentials') {
          setError('Invalid email or password. Please try again.');
        } else {
          setError(authError.message);
        }
        return;
      }

      // Successful login - redirect
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
      <Section variant="surface">
        <div style={{ textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-6)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2" />
              <path
                d="M4 20c0-4 4-6 8-6s8 2 8 6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="heading-2">Welcome Back</h1>
          <p className="text-secondary mt-2">Sign in to your APEX OmniHub account</p>

          <form onSubmit={handleSubmit} style={{ marginTop: 'var(--space-8)' }}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
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
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
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
              />
            </div>

            {error && (
              <p className="form-error" style={{ marginBottom: 'var(--space-4)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn--primary btn--lg"
              style={{ width: '100%' }}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-muted mt-8" style={{ fontSize: 'var(--font-size-sm)' }}>
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
