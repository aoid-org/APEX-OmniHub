import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { useState } from 'react';

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
  const [isStaging, setIsStaging] = useState(false);
  const [url, setUrl] = useState('');

  const handleAction = async (actionId: string, _selected: string[]) => {
    if (actionId === 'add-link') {
      setIsStaging(true);
      return true;
    }
    if (actionId === 'send-to-omnislate') {
      // Future wire-up to context pipeline
      return true;
    }
  };

  return (
    <ModuleShell state={state} onClose={onClose} onAction={handleAction}>
      {isStaging ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border/30 px-3 py-3 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Stage URL Context
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="bg-background border border-border/40 rounded px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60"
          />
          <div className="text-[10px] text-red-400">
            OmniSlate context handoff is not connected yet.
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setIsStaging(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled
              className="px-3 py-1 rounded bg-primary/50 text-primary-foreground text-xs font-bold cursor-not-allowed"
            >
              Add Link
            </button>
          </div>
        </div>
      ) : (
        !state.loading && chips.length > 0 && (
          <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Context Links
            </div>
            <div className="flex flex-wrap gap-1">
              {chips.map((item) => {
                const colors = STATUS_COLOR[item.status] ?? STATUS_COLOR.inactive;
                return (
                  <div
                    key={item.id}
                    title={item.label}
                    className="px-2 py-1 rounded text-[10px] font-medium max-w-[120px] truncate"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </ModuleShell>
  );
}
