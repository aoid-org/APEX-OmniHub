import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, ShieldAlert } from 'lucide-react';

interface Props {
  readonly onClose: () => void;
}

export default function OmniSkillsModule({ onClose }: Props) {
  const state = useOmniModuleState('omniskills');
  const navigate = useNavigate();

  // Derive live counts from registry/live stats — never hardcode.
  const activeStat = state.stats.find(s => s.label === 'Active Skills');
  const freeSkillsStat = state.stats.find(s => s.label === 'Free Skills Used');
  const _activeCount = activeStat?.value ?? '0';
  const freeSkillsStr = freeSkillsStat?.value ?? '0/3';
  
  const [used, total] = freeSkillsStr.split('/').map(n => Number.parseInt(n, 10));
  const freePct = total > 0 ? Math.round((used / total) * 100) : 0;
  const paywallActive = used >= total;

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border/30 p-3 bg-muted/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                SkillForge Entitlement
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
              onClick={() => {
                onClose();
                navigate('/launch/skillforge');
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Forge New Skill
            </Button>
            
            {paywallActive && (
              <p className="text-[10px] text-amber-500/80 text-center leading-tight">
                You have reached your 3 free skills limit.<br/>Upgrade to forge more skills.
              </p>
            )}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}