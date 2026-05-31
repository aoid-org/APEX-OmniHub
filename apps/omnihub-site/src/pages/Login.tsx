import { useState, FormEvent, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { SEOMeta } from '@/components/SEOMeta';
import { Section } from '@/components/Section';
import { toUserFacingAuthError } from '@/lib/authErrorDisplay';
import { hasSupabaseConfig, supabase, supabaseConfigStatus, supabaseConfigTraceId } from '@/lib/supabase';
import type { Provider } from '@supabase/supabase-js';

const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL ?? '/omnidash';

/** Inline SVG fallback so the logo never shows a broken-image icon. */
function LogoFallback() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', margin: '0 auto var(--space-6)', borderRadius: '18px' }}
      aria-label="APEX OmniHub"
    >
      <rect width="72" height="72" rx="18" fill="#1a1f2e" />
      <text
        x="36"
        y="42"
        textAnchor="middle"
        fill="#f97316"
        fontSize="22"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        APEX
      </text>
    </svg>
  );
}


export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<Provider | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (import.meta.env.PROD) return;
    console.warn('[APEX OmniHub] Supabase config status', supabaseConfigStatus);
  }, []);

  const handleOAuthSignIn = async (provider: Provider) => {
    if (!hasSupabaseConfig) {
      setError(`Authentication is misconfigured. Contact an administrator. (Trace: ${supabaseConfigTraceId})`);
      return;
    }
    setOauthLoading(provider);
    setError('');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${globalThis.window.location.origin}/login`,
        },
      });
      if (oauthError) {
        setError(toUserFacingAuthError(oauthError, supabaseConfigTraceId));
        setOauthLoading(null);
      }
    } catch (err) {
      setError(toUserFacingAuthError(err, supabaseConfigTraceId));
      setOauthLoading(null);
    }
  };

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        globalThis.window.location.href = dashboardUrl;
      }
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasSupabaseConfig) {
      setError(`Authentication is misconfigured. Contact an administrator. (Trace: ${supabaseConfigTraceId})`);
      return;
    }

    setIsLoading(true);

    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    // Validate email format using simple checks (avoids regex DoS vulnerabilities)
    const MAX_EMAIL_LENGTH = 254;
    if (email.length > MAX_EMAIL_LENGTH) {
      setError('Email address is too long');
      setIsLoading(false);
      return;
    }

    const atIndex = email.indexOf('@');
    const lastAtIndex = email.lastIndexOf('@');
    const dotAfterAt = email.lastIndexOf('.');
    const isValidEmail =
      atIndex > 0 &&
      atIndex === lastAtIndex &&
      dotAfterAt > atIndex + 1 &&
      dotAfterAt < email.length - 1 &&
      !email.includes(' ');

    if (!isValidEmail) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(toUserFacingAuthError(authError, supabaseConfigTraceId));
        return;
      }

      globalThis.window.location.href = dashboardUrl;
    } catch (err) {
      const userFacingError = toUserFacingAuthError(err, supabaseConfigTraceId);
      if (userFacingError.startsWith('Authentication is misconfigured.')) {
        setError(userFacingError);
        return;
      }

      // TypeError("Failed to fetch" | "NetworkError" | "Load failed") = proxy/tunnel unreachable, not bad credentials.
      const msg = err instanceof TypeError ? err.message.toLowerCase() : '';
      const isNetworkFailure =
        msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed');
      if (isNetworkFailure) {
        setError(
          'Unable to reach the authentication service. Check that the backend is running and accessible, then try again.',
        );
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    globalThis.window.location.reload();
  }, []);

  useEffect(() => {
    // Keep the external sign-out hook synchronized without mutating globals during render.
    (globalThis as Record<string, unknown>).__omnihubSignOut = handleSignOut;

    return () => {
      delete (globalThis as Record<string, unknown>).__omnihubSignOut;
    };
  }, [handleSignOut]);

  return (
    <Layout title="Log In">
      <SEOMeta title="Sign In" description="Sign in to APEX OmniHub." noIndex={true} />
      <Section>
        <div style={{ textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
          {logoError ? (
            <LogoFallback />
          ) : (
            <img
              src="/icon.png"
              alt="APEX OmniHub icon"
              onError={() => setLogoError(true)}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '18px',
                objectFit: 'cover',
                display: 'block',
                margin: '0 auto var(--space-6)',
              }}
            />
          )}
          <h1 className="heading-2">Welcome Back</h1>
          <p className="text-secondary mt-2">Sign in to your APEX OmniHub account</p>

          {!hasSupabaseConfig && (
            <div
              role="alert"
              style={{
                marginTop: 'var(--space-6)',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: 'var(--font-size-sm)',
                lineHeight: 1.5,
              }}
            >
                <strong>Authentication service not configured.</strong>
                <br />
                Set <code style={{ fontSize: '0.85em' }}>VITE_SUPABASE_URL</code> and{' '}
                <code style={{ fontSize: '0.85em' }}>VITE_SUPABASE_PUBLISHABLE_KEY</code> in your
                Cloudflare Pages environment variables. <span style={{ opacity: 0.85 }}>If your
                project still uses the legacy key name, <code style={{ fontSize: '0.85em' }}>VITE_SUPABASE_ANON_KEY</code> is also supported.</span>
                <br />
                <span style={{ opacity: 0.7 }}>Trace: {supabaseConfigTraceId}</span>
            </div>
          )}

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

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '24px 0',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
            <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Or continue with
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={isLoading || oauthLoading !== null}
              onClick={() => handleOAuthSignIn('google')}
            >
              {oauthLoading === 'google' ? (
                'Loading...'
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={isLoading || oauthLoading !== null}
              onClick={() => handleOAuthSignIn('apple')}
            >
              {oauthLoading === 'apple' ? (
                'Loading...'
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Apple
                </>
              )}
            </button>
          </div>

          {import.meta.env.VITE_CONNECT_AI_ENABLED === 'true' && (
            <a
              href={`${dashboardUrl}?connect-ai=true`}
              className="btn btn--secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                marginTop: 12,
                textDecoration: 'none',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Connect AI
            </a>
          )}

          <p className="text-muted mt-8" style={{ fontSize: 'var(--font-size-sm)' }}>
            Don&apos;t have an account?{' '}
            <a href="/request-access" style={{ color: 'var(--color-accent)' }}>
              Request Access
            </a>
          </p>
        </div>
      </Section>
    </Layout>
  );
}
