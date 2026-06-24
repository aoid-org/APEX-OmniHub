import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { BrainCircuit, Sparkles, ArrowRight, Target, Wallet, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type GeneratedSkill = {
  id: string;
  name: string;
  description: string;
  tier: 'CORE' | 'GROWTH_ENGINE';
};

type OnboardingState = {
  description: string;
  goal: string;
  skills: GeneratedSkill[];
  selectedTier: 'BASIC' | 'PRO' | null;
};

export function OnboardingWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Resolve step from URL or fallback to state
  const urlStep = Number.parseInt(searchParams.get('step') || '1', 10);
  const [step, setStep] = useState(urlStep);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [authState, setAuthState] = useState({
    email: '',
    password: '',
    isLoading: false,
    mode: 'signup' as 'signup' | 'signin'
  });

  // State persistence across OAuth / redirects
  const [sessionData, setSessionData] = useState<OnboardingState>(() => {
    const saved = sessionStorage.getItem('omnihub_onboarding');
    return saved ? JSON.parse(saved) : { description: '', goal: '', skills: [], selectedTier: null };
  });

  useEffect(() => {
    sessionStorage.setItem('omnihub_onboarding', JSON.stringify(sessionData));
  }, [sessionData]);

  const handleFinalActivation = useCallback(async (tier: 'BASIC' | 'PRO') => {
    if (isActivating) return;
    setIsActivating(true);

    try {
      if (tier === 'BASIC') {
        const { error } = await supabase.functions.invoke('activate-client', {
          body: { tier: 'BASIC', skills: sessionData.skills.filter(s => s.tier === 'CORE') }
        });

        if (error) throw error;

        sessionStorage.removeItem('omnihub_onboarding');
        navigate('/omnidash?onboarded=true');

      } else if (tier === 'PRO') {
        const returnUrl = new URL(globalThis.location.origin);

        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            tier: 'PRO',
            skills: sessionData.skills,
            returnUrl: returnUrl.toString()
          }
        });

        if (error) throw error;

        const rawData = (data as { ok?: boolean; data?: unknown }).ok === true
          ? (data as { data: { url?: string } }).data
          : data;

        if (rawData?.url) {
          globalThis.location.href = rawData.url; // Redirect to Stripe
        } else {
          throw new Error('No checkout URL returned');
        }
      }
    } catch (error: unknown) {
      console.error("Activation failed:", error);
      toast.error(error instanceof Error ? error.message : "Activation failed. Please try again.");
      setIsActivating(false);
    }
  }, [isActivating, navigate, sessionData.skills]);

  // Handle OAuth Return or step sync
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // If we are on Auth Gate (Step 3) and already authenticated, move to Step 4 automatically
      if (step === 3 && session?.user) {
        setStep(4);
      }

      // Auto-activate if we arrived at Step 4 with a tier and session
      if (step === 4 && sessionData.selectedTier && session?.user && !isActivating) {
        handleFinalActivation(sessionData.selectedTier);
      }
    };
    checkAuth();
  }, [step, sessionData.selectedTier, isActivating, handleFinalActivation]);

  const updateSession = (updates: Partial<OnboardingState>) => {
    setSessionData(prev => ({ ...prev, ...updates }));
  };

  const analyzeBusiness = async () => {
    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-business-skills', {
        body: {
          description: sessionData.description,
          goal: sessionData.goal
        }
      });

      if (error) throw error;

      if (data?.skills) {
        updateSession({ skills: data.skills });
        setStep(2);
      }
    } catch (error: unknown) {
      console.error('Analysis failed:', error);
      toast.error('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectTier = async (tier: 'BASIC' | 'PRO') => {
    updateSession({ selectedTier: tier });

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      // User is authenticated, skip Step 3
      setStep(4);
    } else {
      // User is not authenticated, show inline auth
      setStep(3);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      if (authState.mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: authState.email,
          password: authState.password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authState.email,
          password: authState.password,
        });
        if (error) throw error;
      }

      // Successfully authenticated
      setStep(4);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    const returnUrl = new URL(globalThis.location.href);
    returnUrl.searchParams.set('step', '4'); // Return directly to step 4

    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: returnUrl.toString(),
      }
    });
  };

  const authActionLabel = authState.mode === 'signup' ? 'Create Account' : 'Sign In';

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-6 font-sans">

      {/* STEP 1: DEFINITION (Public) */}
      {step === 1 && (
        <div className="max-w-2xl w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-full mb-4">
              <BrainCircuit className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Define The Entity.</h1>
            <p className="text-gray-400 text-lg">
              OmniHub adapts to <strong>any</strong> industry. Describe your business reality.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="business-description" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Business Description</label>
              <textarea
                id="business-description"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-4 mt-2 h-32 focus:ring-2 focus:ring-blue-500 outline-none transition text-lg"
                placeholder="e.g., I operate a fleet of 10 drone repair technicians in Seattle serving commercial clients..."
                value={sessionData.description}
                onChange={e => updateSession({ description: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="primary-objective" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Primary Objective</label>
              <input
                id="primary-objective"
                type="text"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-4 mt-2 focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                placeholder="e.g., Automate dispatch and upsell maintenance contracts."
                value={sessionData.goal}
                onChange={e => updateSession({ goal: e.target.value })}
              />
            </div>
          </div>

          <button
            onClick={analyzeBusiness}
            disabled={!sessionData.description || !sessionData.goal || isAnalyzing}
            className="w-full py-4 bg-white text-black font-bold rounded-xl text-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <><Sparkles className="w-5 h-5 animate-spin" /> Architecting Intelligence...</>
            ) : (
              <><ArrowRight className="w-5 h-5" /> Generate Operational Architecture</>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: REVEAL (Public) */}
      {step === 2 && (
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-right duration-500">
          {/* COLUMN 1: BASE SYSTEM (Included) */}
          <div className="space-y-6 opacity-60">
            <div className="p-6 border border-white/10 rounded-2xl bg-[#0A0A0A]">
              <h3 className="text-2xl font-bold text-white mb-2">Core Infrastructure</h3>
              <p className="text-gray-400 mb-6">Standard operations generated for your business.</p>
              <div className="space-y-4">
                {sessionData.skills.filter(s => s.tier === 'CORE').map(skill => (
                  <div key={skill.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="p-2 bg-gray-800 rounded-md"><Target className="w-4 h-4 text-gray-400"/></div>
                    <div>
                      <h4 className="font-bold text-sm">{skill.name}</h4>
                      <p className="text-xs text-gray-500">{skill.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => selectTier('BASIC')} className="w-full py-3 text-gray-500 hover:text-white transition">
              Initialize Base Only (Free)
            </button>
          </div>

          {/* COLUMN 2: PRO TIER (Paywall) */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative p-8 border border-emerald-500/30 rounded-2xl bg-[#050505] h-full flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold mb-3 border border-emerald-500/20">
                    <Sparkles className="w-3 h-3"/> ADVANCED ENGINES
                  </div>
                  <h3 className="text-3xl font-bold text-white">Revenue Engines</h3>
                </div>
                <Wallet className="w-8 h-8 text-emerald-500" />
              </div>

              <p className="text-gray-400 mb-8">
                Based on your inputs, OmniDev has architected these <strong>custom high-leverage agents</strong> to generate immediate ROI.
              </p>

              <div className="space-y-4 mb-8 flex-grow">
                {sessionData.skills.filter(s => s.tier === 'GROWTH_ENGINE').map(skill => (
                  <div key={skill.id} className="flex items-start gap-4 p-4 border border-emerald-500/20 bg-emerald-950/10 rounded-xl hover:bg-emerald-950/20 transition cursor-default">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 mt-1">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-emerald-100">{skill.name}</h4>
                      </div>
                      <p className="text-sm text-gray-400 leading-snug">{skill.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-6 mt-auto">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Monthly Licensing</p>
                    <p className="text-3xl font-bold text-white">$49<span className="text-lg text-gray-500 font-normal">/mo</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-emerald-400 mb-1">Pro Tier Features</p>
                    <p className="text-xl font-mono font-bold text-emerald-500">Unlimited</p>
                  </div>
                </div>
                <button
                  onClick={() => selectTier('PRO')}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-[1.02]"
                >
                  Unlock Revenue Engines
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: AUTH GATE (Inline) */}
      {step === 3 && (
        <div className="max-w-md w-full space-y-6 animate-in slide-in-from-bottom duration-500">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">Secure Your Architecture</h2>
            <p className="text-gray-400">Create an account to save your generated systems.</p>
          </div>

          <div className="bg-[#0A0A0A] p-6 border border-white/10 rounded-2xl space-y-4">
            <button
              onClick={() => handleOAuth('google')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition"
            >
              Continue with Google
            </button>
            <button
              onClick={() => handleOAuth('apple')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-black text-white font-semibold rounded-lg border border-white/20 hover:bg-gray-900 transition"
            >
              Continue with Apple
            </button>

            <div className="relative py-4 flex items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="mx-4 text-xs text-gray-500">OR</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label htmlFor="onboarding-email" className="text-sm text-gray-400">Email</label>
                <input
                  id="onboarding-email"
                  type="email"
                  required
                  className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2 mt-1 focus:ring-1 focus:ring-blue-500 outline-none"
                  value={authState.email}
                  onChange={e => setAuthState({...authState, email: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="onboarding-password" className="text-sm text-gray-400">Password</label>
                <input
                  id="onboarding-password"
                  type="password"
                  required
                  minLength={6}
                  className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2 mt-1 focus:ring-1 focus:ring-blue-500 outline-none"
                  value={authState.password}
                  onChange={e => setAuthState({...authState, password: e.target.value})}
                />
              </div>

              <button
                type="submit"
                disabled={authState.isLoading}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {authState.isLoading ? 'Processing...' : authActionLabel}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              {authState.mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => setAuthState({...authState, mode: authState.mode === 'signup' ? 'signin' : 'signup'})}
                className="ml-2 text-blue-400 hover:text-blue-300 underline"
              >
                {authState.mode === 'signup' ? 'Sign In' : 'Create Account'}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* STEP 4: ACTIVATE (Loading / Redirecting) */}
      {step === 4 && (
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in duration-500">
          <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 rounded-full mb-4">
            {sessionData.selectedTier === 'PRO' ? (
              <Wallet className="w-12 h-12 text-emerald-400 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-12 h-12 text-blue-400 animate-pulse" />
            )}
          </div>
          <h2 className="text-3xl font-bold">
            {sessionData.selectedTier === 'PRO' ? 'Preparing Secure Checkout' : 'Activating Your Architecture'}
          </h2>
          <p className="text-gray-400 text-lg">
            {sessionData.selectedTier === 'PRO'
              ? 'Redirecting to Stripe...'
              : 'Provisioning initial systems to OmniDash...'}
          </p>
        </div>
      )}

    </div>
  );
}
