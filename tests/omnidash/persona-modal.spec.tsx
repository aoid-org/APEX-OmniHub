import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PersonaModal from '@/dashboard/components/PersonaModal';
import { AGENT_PREFS_STORAGE_KEY, readAgentPrefs, writeAgentPrefs, type AgentPersona } from '@/omnidash/agentPrefs';

describe('Persona system', () => {
  it('persists selected persona into apex.agent.prefs.v1', () => {
    const onSelect = (next: AgentPersona) => writeAgentPrefs({ persona: next });

    render(
      <PersonaModal
        isOpen={true}
        currentPersona="Navigator"
        onClose={() => undefined}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('persona-option-sentinel'));
    expect(readAgentPrefs().persona).toBe('Sentinel');
    expect(globalThis.window.localStorage.getItem(AGENT_PREFS_STORAGE_KEY)).toContain('Sentinel');
  });
});
