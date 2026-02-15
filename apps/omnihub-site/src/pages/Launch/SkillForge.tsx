import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Step {
  id: number;
  icon: typeof Sparkles;
  question: string;
  field: 'intent' | 'trigger' | 'constraints';
  placeholder: string;
}

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

  const handleForge = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-business-skills', {
        body: {
          intent: formData.intent,
          trigger: formData.trigger,
          constraints: formData.constraints,
        },
      });

      if (error) {
        // Check for 402 Payment Required (entitlement limit)
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

      if (data?.success) {
        toast.success('SKILL FORGED', {
          description: `${data.skill.name} is now operational`,
        });
        setStep(4); // Success state
      }
    } catch (err) {
      console.error('Forge error:', err);
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
      handleForge();
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
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-amber-500/20 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Skill Forge</h1>
          <p className="text-amber-200 text-lg">
            Create custom AI skills to automate your business workflows
          </p>
        </div>

        {/* Progress Bar */}
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

        {/* Wizard Steps */}
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
              {/* Step Icon & Question */}
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

              {/* Input */}
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

              {/* Next Button */}
              <button
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
            // Success State (Step 4)
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
                onClick={handleReset}
                className="bg-amber-500/20 border border-amber-500 text-amber-300 font-semibold py-3 px-8 rounded-lg hover:bg-amber-500/30 transition-all"
              >
                Forge Another Skill
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Hint */}
        {step <= 3 && (
          <p className="text-center text-amber-400/60 text-sm">
            Free tier: 3 skills maximum. Upgrade to Architect Tier for unlimited skills.
          </p>
        )}
      </div>
    </div>
  );
}
