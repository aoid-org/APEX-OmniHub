export const AGENT_PREFS_STORAGE_KEY = 'apex.agent.prefs.v1';

export type AgentPersona = 'Navigator' | 'Companion' | 'Sentinel' | 'Pulse';

export interface AgentPrefs {
  persona: AgentPersona;
}

const VALID_PERSONAS: readonly AgentPersona[] = ['Navigator', 'Companion', 'Sentinel', 'Pulse'] as const;

const DEFAULT_PREFS: AgentPrefs = { persona: 'Navigator' };

export function readAgentPrefs(): AgentPrefs {
  if (globalThis.window === undefined) {
    return DEFAULT_PREFS;
  }

  try {
    const raw = globalThis.window.localStorage.getItem(AGENT_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;

    const parsed = JSON.parse(raw) as Partial<AgentPrefs>;
    const isValid = VALID_PERSONAS.includes(parsed.persona as AgentPersona);
    if (!isValid) return DEFAULT_PREFS;

    return { persona: parsed.persona as AgentPersona };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writeAgentPrefs(next: AgentPrefs): void {
  if (globalThis.window === undefined) {
    return;
  }
  globalThis.window.localStorage.setItem(AGENT_PREFS_STORAGE_KEY, JSON.stringify(next));
}
