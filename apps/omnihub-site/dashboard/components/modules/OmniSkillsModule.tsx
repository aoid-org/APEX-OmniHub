import { Suspense, lazy, useState } from 'react';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';
import omniskillsIcon from '../../../../../src/assets/omniskills-icon.png';

// Forge wizard renders inside this modal (no page route). Lazy so its submit-time
// supabase dependency never loads unless the user actually opens the forge.
const OmniSkillsForgePanel = lazy(() => import('./OmniSkillsForgePanel'));

interface Props {
  readonly onClose: () => void;
}

export default function OmniSkillsModule({ onClose }: Props) {
  const state = useOmniModuleState('omniskills');
  const [forging, setForging] = useState(false);

  // Derive live counts from registry/live stats — never hardcode.
  const freeSkillsStat = state.stats.find(s => s.label === 'Free Skills Used');
  const freeSkillsStr = freeSkillsStat?.value ?? '0/5';
  
  const [used, total] = freeSkillsStr.split('/').map(n => Number.parseInt(n, 10));
  const freePct = total > 0 ? Math.round((used / total) * 100) : 0;
  const paywallActive = used >= total;

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && forging && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          }
        >
          <OmniSkillsForgePanel onBack={() => setForging(false)} />
        </Suspense>
      )}
      {!state.loading && !forging && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border/30 p-3 bg-muted/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                OmniSkills Entitlement
              </div>
              {paywallActive && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 uppercase">
                  <ShieldAlert className="w-3 h-3" />
                  Paywall Active
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${paywallActive ? 'bg-amber-500' : 'bg-gradient-to-r from-purple-500 to-cyan-500'}`}
                  style={{ width: `${freePct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums font-medium">
                {freeSkillsStr}
              </span>
            </div>
            
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 border-none"
              onClick={() => setForging(true)}
            >
              <img src={omniskillsIcon} alt="" aria-hidden="true" className="w-4 h-4 mr-2 object-contain" />
              Forge New Skill
            </Button>
            
            {paywallActive && (
              <p className="text-[10px] text-amber-500/80 text-center leading-tight">
                You have reached your 5 free skills limit.<br/>Upgrade to forge more skills.
              </p>
            )}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}