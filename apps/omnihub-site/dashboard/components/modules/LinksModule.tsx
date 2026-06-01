import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

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

  // Derive chips from real items — never hardcode static names.
  const chips = state.items.slice(0, 6);

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && chips.length > 0 && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Connection Health
          </div>
          <div className="flex flex-wrap gap-1">
            {chips.map((item) => {
              const colors = STATUS_COLOR[item.status] ?? STATUS_COLOR.inactive;
              // Show first 4 chars of label for compact chip
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
