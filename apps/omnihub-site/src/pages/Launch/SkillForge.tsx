import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, ShieldCheck, ArrowRight, CheckCircle2, Mic, MicOff } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { appendTranscript, useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface Step {
  id: number;
  icon: typeof Sparkles;
  question: string;
  field: 'intent' | 'trigger' | 'constraints';
  placeholder: string;
}

const skillForgeRequestSchema = z.object({
  intent: z.string().min(8).max(300),
  trigger: z.string().min(8).max(300),
  constraints: z.string().min(8).max(500),
});

const forgeResponseSchema = z.object({
  success: z.literal(true),
  skill: z.object({
    name: z.string().min(1),
  }),
});

const WIZARD_STEPS: Step[] = [
  {
    id: 1,
    icon: Sparkles,
    question: 'What is the specific outcome you want this skill to achieve?',
    field: 'intent',
    placeholder: 'e.g., Auto-save invoices to Xero when payment is received',
  },
  {
    id: 2,
    icon: Zap,
    question: 'When does this skill activate?',
    field: 'trigger',
    placeholder: 'e.g., New payment notification from Stripe webhook',
  },
  {
    id: 3,
    icon: ShieldCheck,
    question: 'What constraints or rules should this skill follow?',
    field: 'constraints',
    placeholder: 'e.g., Only process invoices over $100, skip duplicates',
  },
];

export function SkillForge() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    intent: '',
    trigger: '',
    constraints: '',
  });
  const currentStep = WIZARD_STEPS[step - 1];
  const progressWidth = (step / 3) * 100;

  const { isListening, toggle: handleVoiceToggle, stop: stopVoice } = useSpeechRecognition({
    onTranscript: (transcript) => {
      const field = currentStep.field;
      setFormData((previous) => ({
        ...previous,
        [field]: appendTranscript(previous[field], transcript),
      }));
    },
    onUnsupported: () =>
      toast.error('VOICE UNAVAILABLE', { description: 'Your browser does not support speech recognition for OmniSkills.' }),
    onError: () =>
      toast.error('VOICE CAPTURE FAILED', { description: 'Could not capture speech. Please retry.' }),
  });

  // Stop recognition cleanly on step change (unmount is handled by the hook).
  useEffect(() => stopVoice, [step, stopVoice]);

  const handleForge = async () => {
    stopVoice();

    const parsed = skillForgeRequestSchema.safeParse(formData);
    if (!parsed.success) {
      toast.error('INVALID INPUT', { description: parsed.error.issues[0]?.message ?? 'Please complete all fields.' });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-business-skills', {
        body: parsed.data,
      });

      if (error) {
        if (error.context?.status === 402) {
          toast.error('SYSTEM OVERLOAD', {
            description: 'Upgrade to Architect Tier to forge more skills.',
            duration: 5000,
          });
        } else {
          toast.error('FORGE FAILED', {
            description: error.message || 'Could not create skill',
          });
        }
        setLoading(false);
        return;
      }

      const response = forgeResponseSchema.safeParse(data);
      if (!response.success) {
        toast.error('FORGE FAILED', {
          description: 'Invalid server response received.',
        });
        return;
      }

      toast.success('SKILL FORGED', {
        description: `${response.data.skill.name} is now operational`,
      });
      setStep(4);
    } catch {
      toast.error('FORGE FAILED', {
        description: 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      void handleForge();
    }
  };

  const handleReset = () => {
    setStep(1);
    setFormData({ intent: '', trigger: '', constraints: '' });
  };

  const isCurrentFieldEmpty = !formData[currentStep?.field || 'intent'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-amber-900 text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-amber-500/20 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">OmniSkills</h1>
          <p className="text-amber-200 text-lg">
            Create custom AI skills to automate your business workflows
          </p>
        </div>

        {step <= 3 && (
          <div className="w-full bg-amber-950/50 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressWidth}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {step <= 3 ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="bg-black/30 backdrop-blur-sm rounded-lg p-8 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/10 rounded-lg">
                  <currentStep.icon className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                    Step {step} of 3
                  </p>
                  <h2 className="text-2xl font-semibold">{currentStep.question}</h2>
                </div>
              </div>

              <textarea
                autoFocus
                value={formData[currentStep.field]}
                onChange={(e) =>
                  setFormData({ ...formData, [currentStep.field]: e.target.value })
                }
                placeholder={currentStep.placeholder}
                rows={4}
                className="w-full bg-black/50 border border-amber-700/30 rounded-lg px-4 py-3 text-white placeholder-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  disabled={loading}
                  className={`flex items-center gap-2 text-sm font-semibold py-2 px-4 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isListening
                      ? 'bg-orange-500/20 border-orange-500 text-orange-300 animate-pulse'
                      : 'bg-amber-500/10 border-amber-700/30 text-amber-300 hover:bg-amber-500/20'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isListening ? 'Stop voice input' : 'Use voice input'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={isCurrentFieldEmpty || loading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <span>Forging Skill...</span>}
                {!loading && step < 3 && (
                  <>
                    Next <ArrowRight className="w-5 h-5" />
                  </>
                )}
                {!loading && step >= 3 && (
                  <>
                    Forge Skill <Sparkles className="w-5 h-5" />
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-black/30 backdrop-blur-sm rounded-lg p-12 text-center space-y-6"
            >
              <div className="inline-flex items-center justify-center p-4 bg-green-500/20 rounded-full">
                <CheckCircle2 className="w-16 h-16 text-green-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">Skill Operational</h2>
                <p className="text-amber-200">
                  Your custom skill has been forged and is now active in your OmniHub
                  orchestrator.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="bg-amber-500/20 border border-amber-500 text-amber-300 font-semibold py-3 px-8 rounded-lg hover:bg-amber-500/30 transition-all"
              >
                Forge Another Skill
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {step <= 3 && (
          <p className="text-center text-amber-400/60 text-sm">
            Free tier: 5 skills maximum. Upgrade to Architect Tier for unlimited skills.
          </p>
        )}
      </div>
    </div>
  );
}
