import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PersonaModal } from '@/components/omnidash/PersonaModal';
import { AGENT_PREFS_STORAGE_KEY, readAgentPrefs, writeAgentPrefs, type AgentPersona } from '@/omnidash/agentPrefs';
import { OmniDashTopHeader } from '@/components/omnidash/TopHeader';

describe('Persona system', () => {
  it('persists selected persona into apex.agent.prefs.v1', () => {
    const onSelect = (next: AgentPersona) => writeAgentPrefs({ persona: next });

    render(
      <PersonaModal
        open
        currentPersona="Navigator"
        onOpenChange={() => undefined}
        onSelectPersona={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('persona-option-sentinel'));
    expect(readAgentPrefs().persona).toBe('Sentinel');
    expect(globalThis.window.localStorage.getItem(AGENT_PREFS_STORAGE_KEY)).toContain('Sentinel');
  });

  it('renders required top header controls including Connect AI', () => {
    render(
      <MemoryRouter>
        <OmniDashTopHeader userEmail="admin@example.com" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('top-header-logo')).toBeInTheDocument();
    expect(screen.getByTestId('global-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('organization-badge-input')).toBeInTheDocument();
    expect(screen.getByTestId('connect-ai-header-action')).toBeInTheDocument();
    expect(screen.getByTestId('notifications-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('persona-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('user-menu-trigger')).toBeInTheDocument();
  });

  it('keeps personas modal-only (not visible until persona trigger is clicked)', () => {
    render(
      <MemoryRouter>
        <OmniDashTopHeader userEmail="admin@example.com" />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('persona-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('persona-trigger'));

    expect(screen.getByTestId('persona-modal')).toBeInTheDocument();
    expect(screen.getByTestId('persona-option-navigator')).toBeInTheDocument();
    expect(screen.getByTestId('persona-option-companion')).toBeInTheDocument();
    expect(screen.getByTestId('persona-option-sentinel')).toBeInTheDocument();
    expect(screen.getByTestId('persona-option-pulse')).toBeInTheDocument();
  });
});
