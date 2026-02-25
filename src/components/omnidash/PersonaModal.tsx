import { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { AgentPersona } from '@/omnidash/agentPrefs';

interface PersonaOption {
  id: AgentPersona;
  tone: string;
  focus: string;
}

const PERSONAS: readonly PersonaOption[] = [
  { id: 'Navigator', tone: 'Calm', focus: 'Trustworthy guidance' },
  { id: 'Companion', tone: 'Human', focus: 'Approachable collaboration' },
  { id: 'Sentinel', tone: 'Precise', focus: 'Security and risk controls' },
  { id: 'Pulse', tone: 'Adaptive', focus: 'Fast execution cadence' },
] as const;

interface PersonaModalProps {
  open: boolean;
  currentPersona: AgentPersona;
  onOpenChange: (next: boolean) => void;
  onSelectPersona: (next: AgentPersona) => void;
}

export function PersonaModal({
  open,
  currentPersona,
  onOpenChange,
  onSelectPersona,
}: Readonly<PersonaModalProps>) {
  const orderedPersonas = useMemo(
    () => [
      ...PERSONAS.filter((persona) => persona.id === currentPersona),
      ...PERSONAS.filter((persona) => persona.id !== currentPersona),
    ],
    [currentPersona],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-orange-500/30 bg-slate-900 text-slate-100" data-testid="persona-modal">
        <DialogHeader>
          <DialogTitle>Agent Persona</DialogTitle>
          <DialogDescription className="text-slate-400">
            Choose how APEX Agent communicates and prioritizes actions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {orderedPersonas.map((persona) => {
            const selected = persona.id === currentPersona;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => onSelectPersona(persona.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700 bg-slate-950 hover:border-cyan-400/50'
                }`}
                data-testid={`persona-option-${persona.id.toLowerCase()}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-semibold">{persona.id}</p>
                  {selected && <span className="text-xs text-orange-300">Active</span>}
                </div>
                <p className="text-xs text-slate-400">{persona.tone} · {persona.focus}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
