import { useMemo, useState } from 'react';
import { Bot, ChevronDown, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NotificationCenter } from '@/dashboard/components/NotificationCenter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import PersonaModal from '@/dashboard/components/PersonaModal';
import { type AgentPersona, readAgentPrefs, writeAgentPrefs } from '@/omnidash/agentPrefs';

const ORG_BADGE_STORAGE_KEY = 'apex.org.badge.v1';

function readOrgBadge(): string {
  if (globalThis.window === undefined) return 'APEX Org';
  return globalThis.window.localStorage.getItem(ORG_BADGE_STORAGE_KEY) ?? 'APEX Org';
}

interface OmniDashTopHeaderProps {
  userEmail?: string;
}

export function OmniDashTopHeader({ userEmail }: Readonly<OmniDashTopHeaderProps>) {
  const [orgBadge, setOrgBadge] = useState<string>(() => readOrgBadge());
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [activePersona, setActivePersona] = useState<AgentPersona>(() => readAgentPrefs().persona as AgentPersona);


  const initials = useMemo(() => {
    if (!userEmail) return 'U';
    const [first] = userEmail;
    return first.toUpperCase();
  }, [userEmail]);

  const updateOrgBadge = (next: string) => {
    setOrgBadge(next);
    if (globalThis.window !== undefined) {
      globalThis.window.localStorage.setItem(ORG_BADGE_STORAGE_KEY, next);
    }
  };

  const selectPersona = (next: AgentPersona) => {
    setActivePersona(next);
    writeAgentPrefs({ persona: next });
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-orange-500/20 bg-slate-950/95 backdrop-blur" data-testid="omnidash-top-header">
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="flex min-w-[150px] items-center gap-2 text-sm font-semibold text-slate-100" data-testid="top-header-logo">
            <Bot className="h-4 w-4 text-orange-400" />
            <span>APEX OmniDash</span>
          </div>

          <label className="relative hidden flex-1 md:block" aria-label="Global Search" data-testid="global-search-container">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 pl-9 pr-3 text-sm text-slate-100 outline-none ring-orange-500/40 focus:ring opacity-50 cursor-not-allowed"
              placeholder="Search Unavailable (Not Implemented)"
              data-testid="global-search-input"
              disabled
            />
          </label>

          <input
            type="text"
            value={orgBadge}
            onChange={(event) => updateOrgBadge(event.target.value)}
            className="h-8 w-28 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200 md:w-36"
            aria-label="Organization Badge"
            data-testid="organization-badge-input"
          />

          <Button asChild className="h-8 bg-orange-600 px-3 text-xs hover:bg-orange-500" data-testid="connect-ai-header-action">
            <Link to="/apex">Connect AI</Link>
          </Button>

          <NotificationCenter />

          <Button
            type="button"
            variant="outline"
            className="h-8 border-cyan-500/40 bg-slate-900 px-2 text-xs text-cyan-300"
            onClick={() => setShowPersonaModal(true)}
            data-testid="persona-trigger"
          >
            {activePersona}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-300"
                data-testid="user-menu-trigger"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px]">{initials}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/agent">Open Agent</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <PersonaModal
        isOpen={showPersonaModal}
        currentPersona={activePersona}
        onClose={() => setShowPersonaModal(false)}
        onSelect={selectPersona}
      />
    </>
  );
}
