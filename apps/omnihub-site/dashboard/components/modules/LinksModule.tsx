import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function LinksModule({ onClose }: Props) {
  const state = useOmniModuleState('links');

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Connection Health
        </div>
        <div className="flex gap-1">
          {['Salesforce', 'Slack', 'Jira', 'Stripe', 'HubSpot'].map((name) => (
            <div
              key={name}
              className="flex-1 text-center py-1 rounded text-[10px] font-medium"
              style={{
                background: name === 'Stripe' ? 'rgba(250,204,21,0.1)' : 'rgba(52,211,153,0.1)',
                color: name === 'Stripe' ? '#facc15' : '#34d399',
              }}
            >
              {name.slice(0, 4)}
            </div>
          ))}
        </div>
      </div>
    </ModuleShell>
  );
}
