import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Target, Zap, ShieldCheck, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import omniskillsIcon from '../../../../../src/assets/omniskills-icon.png';

/**
 * In-modal OmniSkills forge wizard. Replaces the old full-page `/launch/skillforge`
 * route so the OmniSkills surface stays a modal (GATE 1: modal-only, no page nav).
 * Reuses the same `generate-business-skills` edge function and request contract as
 * the legacy page. Supabase is imported lazily inside submit so this panel carries
 * no client side effects until the user actually forges.
 */

type FieldKey = 'intent' | 'trigger' | 'constraints';

interface Step {
  readonly icon: typeof Target;
  readonly question: string;
  readonly field: FieldKey;
  readonly placeholder: string;
}

const WIZARD_STEPS: readonly Step[] = [
  {
    icon: Target,
    question: 'What is the specific outcome you want this skill to achieve?',
    field: 'intent',
    placeholder: 'e.g., Auto-save invoices to Xero when payment is received',
  },
  {
    icon: Zap,
    question: 'When does this skill activate?',
    field: 'trigger',
    placeholder: 'e.g., New payment notification from Stripe webhook',
  },
  {
    icon: ShieldCheck,
    question: 'What constraints or rules should this skill follow?',
    field: 'constraints',
    placeholder: 'e.g., Only process invoices over $100, skip duplicates',
  },
];

const forgeRequestSchema = z.object({
  intent: z.string().min(8).max(300),
  trigger: z.string().min(8).max(300),
  constraints: z.string().min(8).max(500),
});

const forgeResponseSchema = z.object({
  success: z.literal(true),
  skill: z.object({ name: z.string().min(1) }),
});

interface Props {
  readonly onBack: () => void;
}

export default function OmniSkillsForgePanel({ onBack }: Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [formData, setFormData] = useState<Record<FieldKey, string>>({
    intent: '',
    trigger: '',
    constraints: '',
  });

  const current = WIZARD_STEPS[step];
  const StepIcon = current?.icon ?? Target;
  const progress = Math.round(((step + 1) / WIZARD_STEPS.length) * 100);
  const currentEmpty = current ? formData[current.field].trim().length < 8 : true;

  const forge = async () => {
    const parsed = forgeRequestSchema.safeParse(formData);
    if (!parsed.success) {
      toast.error('Invalid input', { description: parsed.error.issues[0]?.message ?? 'Please complete all fields.' });
      return;
    }
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.functions.invoke('generate-business-skills', { body: parsed.data });
      if (error) {
        const status = (error as { context?: { status?: number } }).context?.status;
        toast.error(status === 402 ? 'Free skill limit reached' : 'Forge failed', {
          description: status === 402 ? 'Upgrade to forge more skills.' : (error.message || 'Could not create skill.'),
        });
        return;
      }
      const response = forgeResponseSchema.safeParse(data);
      if (!response.success) {
        toast.error('Forge failed', { description: 'Invalid server response received.' });
        return;
      }
      toast.success('Skill forged', { description: `${response.data.skill.name} is now operational.` });
      setDone(true);
    } catch {
      toast.error('Forge failed', { description: 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (step < WIZARD_STEPS.length - 1) setStep(step + 1);
    else void forge();
  };

  if (done) {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-foreground">Your skill has been forged and is now operational.</p>
        <Button variant="outline" className="w-full" onClick={onBack}>
          Back to OmniSkills
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <img src={omniskillsIcon} alt="" aria-hidden="true" className="w-5 h-5 object-contain" />
        <h3 className="text-sm font-semibold text-foreground">Forge a New Skill</h3>
      </div>

      <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="rounded-lg border border-border/30 p-3 bg-muted/10 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <StepIcon className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
              Step {step + 1} of {WIZARD_STEPS.length}
            </p>
            <p className="text-sm font-medium text-foreground leading-snug">{current?.question}</p>
          </div>
        </div>
        <textarea
          value={current ? formData[current.field] : ''}
          onChange={(e) => current && setFormData({ ...formData, [current.field]: e.target.value })}
          placeholder={current?.placeholder}
          rows={3}
          className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => (step === 0 ? onBack() : setStep(step - 1))}
          disabled={loading}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        <Button
          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 border-none"
          onClick={next}
          disabled={loading || currentEmpty}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Forging…</>
          ) : step < WIZARD_STEPS.length - 1 ? (
            <>Next <ArrowRight className="w-4 h-4 ml-2" /></>
          ) : (
            'Forge Skill'
          )}
        </Button>
      </div>
    </div>
  );
}
