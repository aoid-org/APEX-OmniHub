/**
 * BYOMCockpitModule — BYOM Provider Management Widget
 *
 * Displays connected LLM providers, credential health, and management actions
 * within the OmniDash spatial canvas. Follows the standard ModuleShell pattern.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function BYOMCockpitModule({ onClose }: Props) {
  const state = useOmniModuleState('cockpit');

  const connectedStat = state.stats.find(s => s.label === 'Connected');
  const providersStat = state.stats.find(s => s.label === 'Providers');
  const connectedVal = connectedStat?.value ?? '0';
  const providersVal = providersStat?.value ?? '0';
  const connectedNum = Number.parseInt(connectedVal.replaceAll(/\D/g, ''), 10) || 0;
  const providersNum = Number.parseInt(providersVal.replaceAll(/\D/g, ''), 10) || 0;
  const pct = providersNum > 0 ? Math.round((connectedNum / providersNum) * 100) : 0;

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && (
        <div className="space-y-2">
          <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Provider Coverage
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {connectedVal} / {providersVal} connected
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-border/30 px-3 py-1.5 bg-muted/10">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Security
            </div>
            <div className="text-[11px] text-muted-foreground">
              AES-256-GCM encrypted vault | Zod-validated | Rate-limited | Fail-closed CORS
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
