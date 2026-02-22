/**
 * APEX OmniHub Login Page — apps/omnihub-site
 * @version 3.0.0 (BYOM Design)
 * @lastVerified 2026-02-21
 *
 * IMMUTABLE SECTIONS:
 * - hasSupabaseConfig guard in handleSubmit + handleOAuthSignIn
 * - handleOAuthSignIn('google') and handleOAuthSignIn('apple') buttons
 * - Redirect to dashboardUrl after successful login
 *
 * DO NOT:
 * - Remove OAuth buttons (Google / Apple)
 * - Remove hasSupabaseConfig checks
 * - Import shadcn UI components
 * - Revert to non-glassmorphism design
 */

import { useState, FormEvent, useEffect } from 'react';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';
import type { Provider } from '@supabase/supabase-js';
import { ShieldCheck, Lock, ArrowRight } from 'lucide-react';

const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL ?? '/omnidash';

export function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<Provider | null>(null);

  const handleOAuthSignIn = async (provider: Provider) => {
    if (!hasSupabaseConfig) {
      setError('Login is temporarily unavailable. Please contact support.');
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
        setError(oauthError.message);
        setOauthLoading(null);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        globalThis.window.location.href = dashboardUrl;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasSupabaseConfig) {
      setError('Login is temporarily unavailable. Please contact support.');
      return;
    }

    setIsLoading(true);

    if (!email || !password || (mode === 'signup' && !fullName)) {
      setError('Please fill out all required fields');
      setIsLoading(false);
      return;
    }

    const MAX_EMAIL_LENGTH = 254;
    if (email.length > MAX_EMAIL_LENGTH) {
      setError('Email address is too long');
      setIsLoading(false);
      return;
    }

    const atIndex = email.indexOf('@');
    const lastAtIndex = email.lastIndexOf('@');
    const dot आफ्टरAt = email.lastIndexOf('.');
    const isValidEmail =
      atIndex > 0 &&
      atIndex === lastAtIndex &&
      dot आफ्टरAt > atIndex + 1 &&
      dot आफ्टरAt < email.length - 1 &&
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
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        globalThis.window.location.href = dashboardUrl;
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    globalThis.window.location.reload();
  };

  if (typeof globalThis !== 'undefined') {
    (globalThis as Record<string, unknown>).__omnihubSignOut = handleSignOut;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,11%)] relative overflow-hidden font-sans">
      
      {/* Ambient backgrounds */}
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/10 via-transparent to-blue-900/10 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md p-6 relative z-10 flex flex-col items-center">
        
        {/* Header Logo */}
        <div className="text-center mb-8 space-y-4">
          <div className="relative inline-block group">
            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full group-hover:bg-cyan-400/30 transition-all duration-500" />
            <img
              src="/apex-omnihub-icon.png"
              alt="APEX OmniHub"
              className="h-20 w-20 relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                // Fallback if missing
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {mode === 'signin' ? 'Welcome Back' : 'Join APEX'}
            </h1>
            <p className="text-cyan-100/60 text-sm">
              MAN Mode Console
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="w-full bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-600/5" />
          
          <div className="relative z-10">
            {/* Tab switch */}
            <div className="flex bg-black/20 p-1 rounded-lg mb-6">
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                  mode === 'signin' 
                    ? 'bg-orange-500/30 text-orange-400 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                  mode === 'signup' 
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-sm text-cyan-100/80 font-medium">Full Name</label>
                  <div className="relative flex items-center bg-black/20 border border-white/10 rounded-lg focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all overflow-hidden">
                    <div className="pl-3 py-2 text-gray-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      className="w-full bg-transparent border-none text-white placeholder-white/20 px-3 py-2.5 outline-none text-sm"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm text-cyan-100/80 font-medium">Email</label>
                <div className="relative flex items-center bg-black/20 border border-white/10 rounded-lg focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all overflow-hidden">
                  <div className="pl-3 py-2 text-gray-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    className="w-full bg-transparent border-none text-white placeholder-white/20 px-3 py-2.5 outline-none text-sm"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-cyan-100/80 font-medium">Password</label>
                <div className="relative flex items-center bg-black/20 border border-white/10 rounded-lg focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all overflow-hidden">
                  <div className="pl-3 py-2 text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    className="w-full bg-transparent border-none text-white placeholder-white/20 px-3 py-2.5 outline-none text-sm"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:scale-[1.02] text-white font-semibold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {isLoading ? (
                  'Processing...'
                ) : (
                  <>
                    Access Console
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/40 uppercase tracking-widest font-medium">Or continue with</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOAuthSignIn('google')}
                disabled={isLoading || oauthLoading !== null}
                className="flex items-center justify-center gap-2 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-white text-sm font-medium disabled:opacity-50"
              >
                {oauthLoading === 'google' ? '...' : (
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
                onClick={() => handleOAuthSignIn('apple')}
                disabled={isLoading || oauthLoading !== null}
                className="flex items-center justify-center gap-2 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-white text-sm font-medium disabled:opacity-50"
              >
                {oauthLoading === 'apple' ? '...' : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-white">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    Apple
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="text-gray-600 text-xs mt-8 font-medium">
          Protected by APEX Security Layer
        </p>
      </div>
    </div>
  );
}
