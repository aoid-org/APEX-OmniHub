import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { supabase } from '../../../src/lib/supabase';
import { useState } from 'react';
import { Play, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  readonly onClose: () => void;
}

export default function AutomationsModule({ onClose }: Props) {
  const state = useOmniModuleState('automations');
  const [triggering, setTriggering] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  const handleTrigger = async () => {
    setTriggering(true);
    setResult(null);
    try {
      const { error } = await supabase.functions.invoke('execute-automation', {
        body: { automationId: 'manual-trigger', context: { source: 'AutomationsModule' } }
      });
      if (error) throw error;
      setResult('success');
    } catch (err) {
      console.error('Failed to execute automation:', err);
      setResult('error');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Execution Pipeline
          </div>
          <div className="flex items-center gap-1 text-xs">
            {['Trigger', 'Validate', 'Execute', 'Log'].map((step, i) => (
              <div key={step} className="flex items-center gap-1">
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{step}</span>
                {i < 3 && <span className="text-muted-foreground">{'\u2192'}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border/30 p-4 bg-muted/5 flex flex-col items-start gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">Test Automation</h3>
            <p className="text-xs text-muted-foreground">Manually trigger a sync automation pipeline.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {triggering ? 'Executing...' : 'Run Automation'}
            </button>

            {result === 'success' && (
              <span className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Executed
              </span>
            )}
            {result === 'error' && (
              <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                <XCircle className="w-4 h-4" /> Failed to execute
              </span>
            )}
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}
