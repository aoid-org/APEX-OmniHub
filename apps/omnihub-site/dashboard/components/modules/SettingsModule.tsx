import { useOmniModuleState } from '../../../src/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { useState } from 'react';

interface Props {
  readonly onClose: () => void;
}

export default function SettingsModule({ onClose }: Props) {
  const state = useOmniModuleState('settings');
  const [theme, setTheme] = useState('system');

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Appearance
          </div>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setTheme('light')}
              className={`px-3 py-1.5 rounded ${theme === 'light' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'bg-muted/20 border border-border/30 text-muted-foreground hover:bg-muted/40'}`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-3 py-1.5 rounded ${theme === 'dark' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'bg-muted/20 border border-border/30 text-muted-foreground hover:bg-muted/40'}`}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`px-3 py-1.5 rounded ${theme === 'system' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'bg-muted/20 border border-border/30 text-muted-foreground hover:bg-muted/40'}`}
            >
              System
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
            Save Preferences
          </button>
        </div>
      </div>
    </ModuleShell>
  );
}
