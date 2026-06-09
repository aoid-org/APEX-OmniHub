import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { useOmniModal } from '@/stores/omniModalStore';
import { supabase } from '@/lib/supabase';

interface Props {
  readonly onClose: () => void;
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  active:   { bg: 'rgba(52,211,153,0.1)',  text: '#34d399' },
  pending:  { bg: 'rgba(250,204,21,0.1)',   text: '#facc15' },
  error:    { bg: 'rgba(239,68,68,0.1)',    text: '#ef4444' },
  inactive: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' },
};

export default function LinksModule({ onClose }: Props) {
  const state = useOmniModuleState('links');
  const chips = state.items.slice(0, 6);

  const handleAction = async (actionId: string, _selected: string[]) => {
    if (actionId === 'add-link') {
      // Open OmniBoardWizard via OmniSpatialHost — correct SPA modal pattern
      useOmniModal.getState().invoke({
        id: 'links-add-connection',
        provider: 'omnidash',
        type: 'microfrontend',
        title: 'Connect a Link',
        description: 'Identify and authorize a new connection through the OmniLink port.',
        contextData: { moduleKey: 'omniboard-wizard' },
        onComplete: async (result) => {
          await supabase.functions.invoke('omnilink-port', { body: result });
        },
        onCancel: () => {},
      });
      return true;
    }
    if (actionId === 'test-all') {
      return false;
    }
  };

  return (
    <ModuleShell state={state} onClose={onClose} onAction={handleAction}>
      {!state.loading && chips.length > 0 && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Connection Health
          </div>
          <div className="flex flex-wrap gap-1">
            {chips.map((item) => {
              const colors = STATUS_COLOR[item.status] ?? STATUS_COLOR.inactive;
              const shortName = item.label.split(' ')[0]?.slice(0, 4) ?? item.id.slice(0, 4);
              return (
                <div
                  key={item.id}
                  title={item.label}
                  className="px-2 py-1 rounded text-[10px] font-medium"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {shortName}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
