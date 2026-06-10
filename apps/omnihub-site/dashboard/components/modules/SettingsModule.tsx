import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { useLayoutContext } from '../../contexts/LayoutContext';
import { WidgetSettingsPanel } from '../WidgetSettingsModal';
import { useOmniModal } from '@/stores/omniModalStore';

interface Props {
  readonly onClose: () => void;
}

export default function SettingsModule({ onClose }: Props) {
  const state = useOmniModuleState('settings');
  const total = state.items.length;
  const enabled = state.items.filter((i) => i.status === 'active').length;
  const allValidated = total > 0 && state.items.every((i) => i.status !== 'error');
  const versionStat = state.stats.find((s) => s.label === 'Version');

  const { hiddenWidgets, panelLayout, toggleWidget, setPanelLayout, resetWidgetPositions } = useLayoutContext();
  const { close } = useOmniModal();

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && total > 0 && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10 mb-3">
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

      <WidgetSettingsPanel
        hiddenWidgets={hiddenWidgets}
        panelLayout={panelLayout}
        onToggleWidget={toggleWidget}
        onSetPanelLayout={setPanelLayout}
        onResetPositions={resetWidgetPositions}
        onClose={close}
      />
    </ModuleShell>
  );
}
