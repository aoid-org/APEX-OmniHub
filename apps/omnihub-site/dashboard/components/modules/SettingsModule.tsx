import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function SettingsModule({ onClose }: Props) {
  const state = useOmniModuleState('settings');
  // Derive config health from live/registry items — never hardcode.
  const total = state.items.length;
  const enabled = state.items.filter((i) => i.status === 'active').length;
  const allValidated = total > 0 && state.items.every((i) => i.status !== 'error');
  const versionStat = state.stats.find((s) => s.label === 'Version');

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="space-y-4">
        {!state.loading && total > 0 && (
          <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Configuration Health
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`inline-block h-2 w-2 rounded-full ${allValidated ? 'bg-green-400' : 'bg-yellow-400'}`}
              />
              <span className="text-foreground font-medium">
                {enabled} of {total} settings enabled
              </span>
              {versionStat && (
                <span className="ml-auto text-muted-foreground">{versionStat.value}</span>
              )}
            </div>
          </div>
        )}

        {total > 0 ? (
          <div className="rounded-lg border border-border/30 bg-muted/10 overflow-hidden">
            <div className="px-3 py-2 bg-muted/20 border-b border-border/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              Configuration Toggles
            </div>
            <div className="p-3 space-y-3">
              {state.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    {item.detail && <div className="text-xs text-muted-foreground">{item.detail}</div>}
                  </div>
                  <input 
                    type="checkbox" 
                    checked={item.status === 'active'}
                    disabled
                    className="w-4 h-4 rounded border-gray-300 opacity-70"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No configuration settings available from server.
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
