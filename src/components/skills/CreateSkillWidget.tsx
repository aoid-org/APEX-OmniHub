import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, ArrowLeft, Check, Loader2, ShieldCheck, Zap } from 'lucide-react';

type StepField = 'intent' | 'trigger' | 'constraints';
type WizardStep = {
  id: 1 | 2 | 3;
  title: string;
  icon: typeof Sparkles;
  field: StepField;
  placeholder: string;
};

const formSchema = z.object({
  intent: z.string().min(8, 'Intent must be at least 8 characters').max(300),
  trigger: z.string().min(8, 'Trigger must be at least 8 characters').max(300),
  constraints: z.string().min(8, 'Constraints must be at least 8 characters').max(500),
});

const entitlementSchema = z.object({
  used: z.number().int().nonnegative(),
  max: z.number().int().positive(),
  tier: z.string().min(1),
});

const forgeSuccessSchema = z.object({
  success: z.literal(true),
  skill: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
  }),
  entitlement: entitlementSchema,
});

const wizardSteps: WizardStep[] = [
  {
    id: 1,
    title: 'What outcome do you need this skill to achieve?',
    icon: Sparkles,
    field: 'intent',
    placeholder: 'e.g. Auto-save paid invoices into Xero and update CRM status',
  },
  {
    id: 2,
    title: 'What event should activate this skill?',
    icon: Zap,
    field: 'trigger',
    placeholder: 'e.g. Stripe payment_succeeded webhook with invoice metadata',
  },
  {
    id: 3,
    title: 'What constraints must always be enforced?',
    icon: ShieldCheck,
    field: 'constraints',
    placeholder: 'e.g. Process only invoices over $100 and skip duplicate transaction_ids',
  },
];

export function CreateSkillWidget() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({ intent: '', trigger: '', constraints: '' });

  const currentStep = wizardSteps[step - 1];
  const progressWidth = (step / wizardSteps.length) * 100;

  const isStepEmpty = useMemo(() => {
    const value = formData[currentStep.field];
    return value.trim().length === 0;
  }, [currentStep.field, formData]);

  const resetForm = () => {
    setStep(1);
    setFormData({ intent: '', trigger: '', constraints: '' });
    setErrors([]);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = formSchema.safeParse(formData);
      if (!parsed.success) {
        throw new Error(parsed.error.issues.map((issue) => issue.message).join('\n'));
      }

      const { data, error } = await supabase.functions.invoke('generate-business-skills', {
        body: parsed.data,
      });

      if (error) {
        const statusCode = typeof error.context?.status === 'number' ? error.context.status : undefined;
        if (statusCode === 402) {
          throw new Error('SYSTEM OVERLOAD — Upgrade to Architect Tier to forge more skills.');
        }
        throw new Error(error.message || 'Unable to forge skill at this time');
      }

      const result = forgeSuccessSchema.safeParse(data);
      if (!result.success) {
        throw new Error('Forge response was invalid. Please retry.');
      }

      return result.data;
    },
    onSuccess: async (result) => {
      toast({
        title: 'SKILL FORGED',
        description: `${result.skill.name} is operational (${result.entitlement.used}/${result.entitlement.max}).`,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-skills'] }),
        queryClient.invalidateQueries({ queryKey: ['workflows'] }),
      ]);

      resetForm();
      setOpen(false);
    },
    onError: (error: Error) => {
      setErrors(error.message.split('\n'));
      toast({
        title: 'FORGE FAILED',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleNext = () => {
    setErrors([]);
    if (step < 3) {
      setStep((step + 1) as 1 | 2 | 3);
      return;
    }
    mutation.mutate();
  };

  const handleBack = () => {
    setErrors([]);
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Forge Skill
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            Skill Forge
            <Badge variant="secondary" className="text-xs">
              {step}/3
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <currentStep.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Step {step}</p>
              <p className="text-sm font-medium">{currentStep.title}</p>
            </div>
          </div>

          <Textarea
            autoFocus
            rows={5}
            value={formData[currentStep.field]}
            onChange={(event) => {
              setFormData((previous) => ({
                ...previous,
                [currentStep.field]: event.target.value,
              }));
            }}
            placeholder={currentStep.placeholder}
          />
        </div>

        {errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {errors.map((err, index) => (
              <p key={`${index}-${err}`} className="text-sm text-destructive">{err}</p>
            ))}
          </div>
        )}

        <DialogFooter className="flex justify-between gap-2">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={handleBack} size="sm" disabled={mutation.isPending}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <Button
            onClick={handleNext}
            size="sm"
            disabled={isStepEmpty || mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Forging...
              </>
            ) : step < 3 ? (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Forge Skill
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
