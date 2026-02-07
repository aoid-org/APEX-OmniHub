import { useState, useEffect, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
// @ts-expect-error pre-existing type issue - no declaration file
import { Helmet } from 'react-helmet';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLoginRedirect } from '@/hooks/useLoginRedirect';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import apexLogo from '@/assets/apex_emblem_logo.svg';
import { checkRateLimit } from '@/lib/ratelimit';
import { checkAccountLockout, recordLoginAttempt } from '@/lib/security';
import { logSecurityEvent } from '@/lib/monitoring';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

/** Validates redirect parameter is a safe relative path (prevents open redirect) */
function isValidRedirectPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

/** Shared error handler for auth form catch blocks */
function handleAuthFormError(
  error: unknown,
  toast: ReturnType<typeof useToast>['toast'],
) {
  if (error instanceof z.ZodError) {
    toast({
      title: 'Validation error',
      description: error.errors[0].message,
      variant: 'destructive',
    });
  } else if (error instanceof Error) {
    toast({
      title: 'Authentication failed',
      description: 'Invalid credentials or server error. Please try again.',
      variant: 'destructive',
    });
  }
}

/** Reusable loading button for auth forms */
const AuthSubmitButton: FC<{ loading: boolean; label: string; loadingLabel: string }> = ({
  loading, label, loadingLabel,
}) => (
  <Button type="submit" className="w-full" disabled={loading}>
    {loading ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {loadingLabel}
      </>
    ) : (
      label
    )}
  </Button>
);

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { redirect: performPostLoginRedirect, loading: redirectLoading } = useLoginRedirect();

  const defaultTab = searchParams.get('tab') === 'signin' ? 'signin' : 'signup';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !redirectLoading) {
        performPostLoginRedirect();
      }
    }).catch(() => {
      // Session check failed silently — user will see the login form
    });
  }, [redirectLoading, performPostLoginRedirect]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const rateCheck = checkRateLimit('signup', 3, 300000);
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
      const safeRedirect = redirectParam && isValidRedirectPath(redirectParam) ? redirectParam : null;
      const emailRedirectUrl = safeRedirect
        ? `${globalThis.location.origin}/auth?redirect=${encodeURIComponent(safeRedirect)}`
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
      handleAuthFormError(error, toast);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const lockoutStatus = checkAccountLockout(email);
    if (lockoutStatus.isLocked) {
      const remaining = lockoutStatus.remainingTime ?? 60000;
      const minutes = Math.ceil(remaining / 60000);
      toast({
        title: 'Account temporarily locked',
        description: `Too many failed attempts. Try again in ${minutes} minutes.`,
        variant: 'destructive',
      });
      logSecurityEvent('auth_failed', { reason: 'account_locked' });
      return;
    }

    const rateCheck = checkRateLimit(`signin-${email}`, 5, 300000);
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

      if (!redirectLoading) {
        performPostLoginRedirect();
      }
    } catch (error) {
      handleAuthFormError(error, toast);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src={apexLogo}
                alt="APEX OmniHub logo"
                className="h-16 w-16"
                aria-hidden="true"
              />
            </div>
            <CardTitle className="text-2xl">APEX Admin Login</CardTitle>
            <CardDescription>Authorized access only</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
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
                  <AuthSubmitButton loading={loading} label="Sign In" loadingLabel="Signing in..." />
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
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
                  <AuthSubmitButton loading={loading} label="Sign Up" loadingLabel="Creating account..." />
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Auth;