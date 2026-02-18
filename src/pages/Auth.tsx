import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLoginRedirect } from '@/hooks/useLoginRedirect';
import { Loader2, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import { z } from 'zod';
import appIcon from '@/assets/app_icon.png';
import { checkRateLimit } from '@/lib/ratelimit';
import { checkAccountLockout, recordLoginAttempt } from '@/lib/security';
import { logSecurityEvent } from '@/lib/monitoring';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('tab') === 'signup' ? 'signup' : 'signin'
  );
  
  const { toast } = useToast();
  const { redirect: performPostLoginRedirect, loading: redirectLoading } = useLoginRedirect();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !redirectLoading) {
        performPostLoginRedirect();
      }
    });
  }, [redirectLoading, performPostLoginRedirect]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateCheck = checkRateLimit('signup', 3, 300000); // 3 attempts per 5 min
    if (!rateCheck.allowed) {
      toast({
        title: 'Too many attempts',
        description: `Please wait ${Math.ceil(rateCheck.resetIn / 1000)} seconds before trying again.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const validated = authSchema.parse({ email, password, fullName });
      const redirectParam = searchParams.get('redirect');
      const emailRedirectUrl = redirectParam
        ? `${globalThis.location.origin}/auth?redirect=${encodeURIComponent(redirectParam)}`
        : `${globalThis.location.origin}/auth`;

      const { error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: emailRedirectUrl,
          data: { full_name: validated.fullName },
        },
      });

      if (error) throw error;

      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      });
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const lockoutStatus = checkAccountLockout(email);
    if (lockoutStatus.isLocked) {
      toast({
        title: 'Account locked',
        description: `Try again in ${Math.ceil(lockoutStatus.remainingTime! / 60000)} minutes.`,
        variant: 'destructive',
      });
      logSecurityEvent('auth_failed', { reason: 'account_locked', email });
      return;
    }

    const rateCheck = checkRateLimit(`signin-${email}`, 5, 300000);
    if (!rateCheck.allowed) {
      toast({
        title: 'Too many attempts',
        description: `Please wait ${Math.ceil(rateCheck.resetIn / 1000)} seconds.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const validated = authSchema.omit({ fullName: true }).parse({ email, password });
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        recordLoginAttempt(email, false);
        throw error;
      }

      recordLoginAttempt(email, true);
      if (!redirectLoading) performPostLoginRedirect();
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (error: unknown) => {
    if (error instanceof z.ZodError) {
      toast({
        title: 'Validation Error',
        description: error.errors[0].message,
        variant: 'destructive',
      });
    } else if (error instanceof Error) {
      toast({
        title: 'Authentication Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
        <title>Sign In | APEX OmniHub</title>
      </Helmet>
      
      {/* Background with deep navy gradient */}
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,11%)] relative overflow-hidden">
        
        {/* Ambient background effects */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/10 via-transparent to-blue-900/10 pointer-events-none" />
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md p-6 relative z-10">
          <div className="text-center mb-8 space-y-4">
            <div className="relative inline-block group">
              <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full group-hover:bg-cyan-400/30 transition-all duration-500" />
              <img
                src={appIcon}
                alt="APEX OmniHub"
                className="h-20 w-20 relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {mode === 'signin' ? 'Welcome Back' : 'Join APEX'}
              </h1>
              <p className="text-cyan-100/60 text-sm">
                Universal Synchronized Orchestrator
              </p>
            </div>
          </div>

          {/* Glassmorphism Card */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8 space-y-6">
            
            {/* Toggle Switch */}
            <div className="flex bg-black/20 p-1 rounded-lg">
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                  mode === 'signin' 
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' 
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

            <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
              
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-cyan-100/80">Full Name</Label>
                  <div className="relative">
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-black/20 border-white/10 text-white placeholder:text-white/20 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-cyan-100/80">Email</Label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-black/20 border-white/10 text-white placeholder:text-white/20 focus:border-cyan-500/50 focus:ring-cyan-500/20 pl-10 transition-all"
                  />
                  <ShieldCheck className="absolute left-3 top-2.5 h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-cyan-100/80">
                  Password
                </Label>
                <div className="relative group">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-black/20 border-white/10 text-white placeholder:text-white/20 focus:border-cyan-500/50 focus:ring-cyan-500/20 pl-10 transition-all"
                  />
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-6 shadow-lg shadow-cyan-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <span className="flex items-center">
                    {mode === 'signin' ? 'Access Console' : 'Create Account'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                )}
              </Button>

            </form>
          </div>
          
          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-gray-500">
              By accessing this system, you agree to the <a href="/terms" className="text-cyan-400/80 hover:text-cyan-300 hover:underline">Terms of Service</a>.
            </p>
            <p className="text-xs text-gray-600">
              Protected by APEX Security Layer v4.2
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;