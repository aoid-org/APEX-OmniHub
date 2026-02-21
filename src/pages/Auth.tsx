import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLoginRedirect } from '@/hooks/useLoginRedirect';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import appIcon from '@/assets/app_icon.png';
import { checkRateLimit } from '@/lib/ratelimit';
import { checkAccountLockout, recordLoginAttempt } from '@/lib/security';
import { logSecurityEvent } from '@/lib/monitoring';
import { OAuthButtons } from '@/components/auth/OAuthButtons';

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

          <Card className="bg-black/40 border-white/10 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-600/5" />
            
            <CardContent className="p-6 relative z-10">
              <Tabs value={mode} onValueChange={(v) => setMode(v as 'signin' | 'signup')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-black/40 border border-white/5">
                  <TabsTrigger 
                    value="signin"
                    className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
                  >
                    Register
                  </TabsTrigger>
                </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
                <OAuthButtons
                  redirectTo={
                    searchParams.get('redirect')
                      ? `${globalThis.location.origin}/auth?redirect=${encodeURIComponent(searchParams.get('redirect')!)}`
                      : undefined
                  }
                  disabled={loading}
                />
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Sign Up'
                    )}
                  </Button>
                </form>
                <OAuthButtons
                  redirectTo={
                    searchParams.get('redirect')
                      ? `${globalThis.location.origin}/auth?redirect=${encodeURIComponent(searchParams.get('redirect')!)}`
                      : undefined
                  }
                  disabled={loading}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
};

export default Auth;