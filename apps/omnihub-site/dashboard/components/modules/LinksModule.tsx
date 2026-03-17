import { useState } from 'react';
import { useOmniModuleState } from '../../../src/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function LinksModule({ onClose }: Props) {
  const state = useOmniModuleState('links');
  const [links, setLinks] = useState<{url: string, title: string}[]>([]);
  const [input, setInput] = useState('');

  const handleAddLink = () => {
    if (input.trim()) {
      setLinks(prev => [...prev, { url: input.trim(), title: input.trim() }]);
      setInput('');
    }
  };

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="flex flex-col gap-4">
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

        {/* Add Link */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Add Link Reference</div>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://docs.example.com"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-muted/20 border border-border/30 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50"
            />
            <button
              onClick={handleAddLink}
              disabled={!input.trim()}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              Save Link
            </button>
          </div>
        </div>

        {/* Existing Links */}
        {links.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">Saved Links</div>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
              {links.map((link, idx) => (
                <div key={idx} className="flex flex-col text-xs p-2.5 rounded bg-muted/10 border border-border/20 group hover:border-border/40 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-foreground truncate mr-4">{link.title}</span>
                    <button onClick={() => setLinks(links.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
                  </div>
                  <span className="text-muted-foreground truncate text-[11px] mt-1">{link.url}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
