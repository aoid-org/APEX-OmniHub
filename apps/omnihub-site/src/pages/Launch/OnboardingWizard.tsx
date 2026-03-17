import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, BrainCircuit, Lock, ArrowRight, Wallet, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Types for Dynamic Generation
type GeneratedSkill = {
  id: string;
  name: string;
  description: string;
  projected_monthly_revenue: string;
  confidence_score: number;
  tier: 'CORE' | 'GROWTH_ENGINE'; // Growth = Paid
};

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState({ description: '', goal: '' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [proposedSkills, setProposedSkills] = useState<GeneratedSkill[]>([]);
  const navigate = useNavigate();

  // STEP 1 -> 2: THE UNIVERSAL ANALYZER
  const analyzeBusiness = async () => {
    setIsAnalyzing(true);
    // CALL THE SKILL-CREATOR BRAIN
    const { data, error } = await supabase.functions.invoke('generate-business-skills', {
      body: {
        description: input.description,
        goal: input.goal
      }
    });

    if (error) {
        console.error('Analysis failed:', error);
        alert('Analysis failed. Please try again.');
        setIsAnalyzing(false);
        return;
    }

    if (data?.skills) {
      setProposedSkills(data.skills);
      setStep(2);
    }
    setIsAnalyzing(false);
  };

  const activateSystem = async (tier: 'BASIC' | 'PRO') => {
    // 1. Persist the generated SKILL.md files to the user's secure storage
    // 2. Wire them to the Agent Orchestrator
    // 3. Process Payment if PRO

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Handle unauthenticated state - maybe redirect to login or force auth before this step?
        // Ideally the wizard should be behind auth or create a temp user.
        // For now, we assume user is logged in or we handle the error.
        console.error("User not authenticated");
        alert("Please log in to activate your system.");
        navigate('/login');
        return;
    }

    const { error } = await supabase.from('user_entitlements').insert({
      user_id: user.id,
      tier,
      active_skills: proposedSkills.filter(s => tier === 'PRO' || s.tier === 'CORE')
    });

    if (error) {
        console.error("Failed to save entitlements:", error);
        alert("Activation failed. Please try again.");
        return;
    }

    // Redirect to OmniDash via Router
    navigate('/omnidash');
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-6 font-sans">

      {/* STEP 1: DEFINITION (UNIVERSAL INPUT) */}
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
                value={input.description}
                onChange={e => setInput({...input, description: e.target.value})}
              />
            </div>
            <div>
              <label htmlFor="primary-objective" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Primary Objective</label>
              <input
                id="primary-objective"
                type="text"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-4 mt-2 focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                placeholder="e.g., Automate dispatch and upsell maintenance contracts."
                value={input.goal}
                onChange={e => setInput({...input, goal: e.target.value})}
              />
            </div>
          </div>

          <button
            onClick={analyzeBusiness}
            disabled={!input.description || isAnalyzing}
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

      {/* STEP 2: THE REVEAL & PAYWALL (DYNAMIC SKILL WIRING) */}
      {step === 2 && (
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-right duration-500">

          {/* COLUMN 1: BASE SYSTEM (Included) */}
          <div className="space-y-6 opacity-60">
            <div className="p-6 border border-white/10 rounded-2xl bg-[#0A0A0A]">
              <h3 className="text-2xl font-bold text-white mb-2">Core Infrastructure</h3>
              <p className="text-gray-400 mb-6">Standard operations generated for your business.</p>
              <div className="space-y-4">
                {proposedSkills.filter(s => s.tier === 'CORE').map(skill => (
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
            <button onClick={() => activateSystem('BASIC')} className="w-full py-3 text-gray-500 hover:text-white transition">
              Initialize Base Only (Free)
            </button>
          </div>

          {/* COLUMN 2: THE MONEY (Paywall) */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative p-8 border border-emerald-500/30 rounded-2xl bg-[#050505] h-full flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold mb-3 border border-emerald-500/20">
                    <Sparkles className="w-3 h-3"/> AI-DETECTED OPPORTUNITY
                  </div>
                  <h3 className="text-3xl font-bold text-white">Revenue Engines</h3>
                </div>
                <Wallet className="w-8 h-8 text-emerald-500" />
              </div>

              <p className="text-gray-400 mb-8">
                Based on your inputs, OmniDev has architected these <strong>custom high-leverage agents</strong> to generate immediate ROI.
              </p>

              <div className="space-y-4 mb-8 flex-grow">
                {proposedSkills.filter(s => s.tier === 'GROWTH_ENGINE').map(skill => (
                  <div key={skill.id} className="flex items-start gap-4 p-4 border border-emerald-500/20 bg-emerald-950/10 rounded-xl hover:bg-emerald-950/20 transition cursor-default">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 mt-1">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-emerald-100">{skill.name}</h4>
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          {skill.projected_monthly_revenue}
                        </span>
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
                    <p className="text-xs text-emerald-400 mb-1">Est. 1st Month ROI</p>
                    <p className="text-xl font-mono font-bold text-emerald-500">~850%</p>
                  </div>
                </div>
                <button
                  onClick={() => activateSystem('PRO')}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-[1.02]"
                >
                  Unlock Revenue Engines
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
