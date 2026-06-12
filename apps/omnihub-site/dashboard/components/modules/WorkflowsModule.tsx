import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { supabase } from '../../../src/lib/supabase';
import { useState } from 'react';
import { Play, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  readonly onClose: () => void;
}

export default function WorkflowsModule({ onClose }: Props) {
  const state = useOmniModuleState('workflows');
  const [triggering, setTriggering] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  // Derive graph counts from live/registry items — never hardcode.
  const running = state.items.filter((i) => i.status === 'active').length;
  const pending = state.items.filter((i) => i.status === 'pending').length;
  const idle = state.items.filter(
    (i) => i.status === 'inactive' || i.status === 'error',
  ).length;

  const handleTrigger = async () => {
    setTriggering(true);
    setResult(null);
    try {
      const { error } = await supabase.functions.invoke('trigger-workflow', {
        body: { workflowType: 'manual-trigger', taskData: { source: 'WorkflowsModule' } }
      });
      if (error) throw error;
      setResult('success');
    } catch (err) {
      console.error('Failed to trigger workflow:', err);
      setResult('error');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {!state.loading && (
          <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Active Workflow Graph
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-muted-foreground tabular-nums">{running} running</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="text-muted-foreground tabular-nums">{pending} pending</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                <span className="text-muted-foreground tabular-nums">{idle} idle</span>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border/30 p-4 bg-muted/5 flex flex-col items-start gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">Test Workflow Trigger</h3>
            <p className="text-xs text-muted-foreground">Manually dispatch a workflow to the APEX Temporal orchestrator.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {triggering ? 'Dispatching...' : 'Trigger Workflow'}
            </button>

            {result === 'success' && (
              <span className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Dispatched
              </span>
            )}
            {result === 'error' && (
              <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                <XCircle className="w-4 h-4" /> Failed to dispatch
              </span>
            )}
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}
