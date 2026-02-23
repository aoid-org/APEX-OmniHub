/**
 * OmniSkillsWidget — 3-Stage OmniSkill Forge Modal
 *
 * Stage 1: Meta (name + trigger_intent)
 * Stage 2: Intelligence (instructions)
 * Stage 3: Schema (input/output JSON definition)
 *
 * Inserts into user_generated_skills. Invalidates React Query cache on success.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const metaSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  trigger_intent: z.string().min(5, 'Trigger must be at least 5 characters').max(200),
});

const intelligenceSchema = z.object({
  instructions: z.string().min(10, 'Instructions must be at least 10 characters').max(4000),
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Stage = 1 | 2 | 3;

export function OmniSkillsWidget({ children }: { readonly children?: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>(1);
  const [errors, setErrors] = useState<string[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [triggerIntent, setTriggerIntent] = useState('');
  const [instructions, setInstructions] = useState('');
  const [inputSchema, setInputSchema] = useState('{}');
  const [outputSchema, setOutputSchema] = useState('{}');

  const resetForm = useCallback(() => {
    setStage(1);
    setName('');
    setTriggerIntent('');
    setInstructions('');
    setInputSchema('{}');
    setOutputSchema('{}');
    setErrors([]);
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let parsedInput: Record<string, unknown>;
      let parsedOutput: Record<string, unknown>;

      try {
        parsedInput = JSON.parse(inputSchema) as Record<string, unknown>;
      } catch {
        throw new Error('Input schema is not valid JSON');
      }

      try {
        parsedOutput = JSON.parse(outputSchema) as Record<string, unknown>;
      } catch {
        throw new Error('Output schema is not valid JSON');
      }

      // MIGRATION-PENDING: cast removed once 'user_generated_skills' table is applied via supabase migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('user_generated_skills')
        .insert({
          user_id: user.id,
          name,
          trigger_intent: triggerIntent,
          definition: {
            instructions,
            input_schema: parsedInput,
            output_schema: parsedOutput,
          },
        })
        .select('id, name')
        .single() as { data: { id: string; name: string } | null; error: { message: string } | null };

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'OmniSkill Forged',
        description: data?.name
          ? `"${data.name}" is now available in your OmniSkills palette.`
          : 'OmniSkill created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['omni-skills'] }).catch(console.error);
      resetForm();
      setOpen(false);
    },
    onError: (error: Error) => {
      setErrors([error.message]);
    },
  });

  const validateStage = (): boolean => {
    setErrors([]);
    if (stage === 1) {
      const result = metaSchema.safeParse({ name, trigger_intent: triggerIntent });
      if (!result.success) {
        setErrors(result.error.errors.map((e) => e.message));
        return false;
      }
      return true;
    }
    if (stage === 2) {
      const result = intelligenceSchema.safeParse({ instructions });
      if (!result.success) {
        setErrors(result.error.errors.map((e) => e.message));
        return false;
      }
      return true;
    }
    if (stage === 3) {
      try {
        JSON.parse(inputSchema);
      } catch {
        setErrors(['Input schema is not valid JSON']);
        return false;
      }
      try {
        JSON.parse(outputSchema);
      } catch {
        setErrors(['Output schema is not valid JSON']);
        return false;
      }
      return true;
    }
    return false;
  };

  const handleNext = () => {
    if (!validateStage()) return;
    if (stage < 3) setStage((s) => (s + 1) as Stage);
  };

  const handleBack = () => {
    setErrors([]);
    if (stage > 1) setStage((s) => (s - 1) as Stage);
  };

  const handleSubmit = () => {
    if (!validateStage()) return;
    mutation.mutate();
  };

  const stageLabels = ['Meta', 'Intelligence', 'Schema'];

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2 text-white border-white/20 hover:bg-white/10">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Forge OmniSkill</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            OmniSkill Forge
            <Badge variant="secondary" className="text-xs">
              {stage}/3 · {stageLabels[stage - 1]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-1.5 my-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= stage ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Stage 1: Meta */}
        {stage === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="omniskill-name">OmniSkill Name</Label>
              <Input
                id="omniskill-name"
                placeholder="e.g. Invoice Processor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="omniskill-trigger">Trigger Intent</Label>
              <Input
                id="omniskill-trigger"
                placeholder="e.g. Process an invoice from email attachment"
                value={triggerIntent}
                onChange={(e) => setTriggerIntent(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                What should this OmniSkill respond to?
              </p>
            </div>
          </div>
        )}

        {/* Stage 2: Intelligence */}
        {stage === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="omniskill-instructions">System Instructions</Label>
              <Textarea
                id="omniskill-instructions"
                placeholder="You are an invoice processing expert. Extract line items, totals, and vendor details..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={8}
                maxLength={4000}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {instructions.length}/4000 characters
              </p>
            </div>
          </div>
        )}

        {/* Stage 3: Schema */}
        {stage === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="omniskill-input-schema">Input Schema (JSON)</Label>
              <Textarea
                id="omniskill-input-schema"
                value={inputSchema}
                onChange={(e) => setInputSchema(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="omniskill-output-schema">Output Schema (JSON)</Label>
              <Textarea
                id="omniskill-output-schema"
                value={outputSchema}
                onChange={(e) => setOutputSchema(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {errors.map((err, i) => (
              <p key={`err-${i}-${err.slice(0, 10)}`} className="text-sm text-destructive">{err}</p>
            ))}
          </div>
        )}

        <DialogFooter className="flex justify-between gap-2">
          <div>
            {stage > 1 && (
              <Button variant="ghost" onClick={handleBack} size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div>
            {stage < 3 ? (
              <Button onClick={handleNext} size="sm">
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={mutation.isPending}
                size="sm"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Forge OmniSkill
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
