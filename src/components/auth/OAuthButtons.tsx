import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Brain } from 'lucide-react';
import { GoogleIcon, AppleIcon } from '@/components/icons/OAuthIcons';
import type { Provider } from '@supabase/supabase-js';

interface OAuthButtonsProps {
  readonly redirectTo?: string;
  readonly disabled?: boolean;
}

export function OAuthButtons({ redirectTo, disabled = false }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const { toast } = useToast();

  const handleOAuthSignIn = async (provider: Provider) => {
    setLoadingProvider(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectTo ?? `${globalThis.location.origin}/auth`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      toast({
        title: 'Authentication error',
        description: error instanceof Error ? error.message : 'Failed to sign in with provider',
        variant: 'destructive',
      });
      setLoadingProvider(null);
    }
  };

  const isLoading = loadingProvider !== null;

  return (
    <div className="space-y-4 mt-4">
      <div className="relative flex items-center gap-4 my-2">
        <div className="flex-1 h-px bg-white/10" />
        <Button
          variant="outline"
          type="button"
          className="bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 h-8 px-4 py-0 rounded-md text-xs font-semibold tracking-wide shadow-sm"
        >
          <Brain className="mr-2 h-3.5 w-3.5 text-purple-400" />
          CONNECT AI
        </Button>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          type="button"
          disabled={disabled || isLoading}
          onClick={() => handleOAuthSignIn('google')}
        >
          {loadingProvider === 'google' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2" size={18} />
          )}
          Google
        </Button>
        <Button
          variant="outline"
          type="button"
          disabled={disabled || isLoading}
          onClick={() => handleOAuthSignIn('apple')}
        >
          {loadingProvider === 'apple' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <AppleIcon className="mr-2" size={18} />
          )}
          Apple
        </Button>
      </div>
    </div>
  );
}
