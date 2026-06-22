/**
 * OmniSkillsModule — entitlement bar + paywall (free cap = 5).
 *
 * Proves the OmniSkills surface shows N/5, activates the paywall indicator at
 * 5/5, and routes "Forge New Skill" to the protected SkillForge page.
 * useOmniModuleState, react-router, and ModuleShell are mocked.
 */

import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const h = vi.hoisted(() => ({ freeSkills: '2/5', navigate: vi.fn() }));

vi.mock('@/hooks/useOmniModuleState', () => ({
  useOmniModuleState: () => ({
    moduleKey: 'omniskills',
    headline: '',
    stats: [{ label: 'Free Skills Used', value: h.freeSkills }],
    items: [],
    actions: [],
    loading: false,
    error: null,
    stateKind: 'live',
  }),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));

vi.mock('dashboard/components/modules/ModuleShell', () => ({
  ModuleShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import OmniSkillsModule from 'dashboard/components/modules/OmniSkillsModule';

describe('OmniSkillsModule entitlement bar', () => {
  beforeEach(() => {
    h.freeSkills = '2/5';
    h.navigate.mockClear();
  });

  it('renders the free-tier usage as N/5 (max = 5)', () => {
    render(<OmniSkillsModule onClose={vi.fn()} />);
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('does not show the paywall indicator below the cap', () => {
    h.freeSkills = '2/5';
    render(<OmniSkillsModule onClose={vi.fn()} />);
    expect(screen.queryByText(/paywall active/i)).not.toBeInTheDocument();
  });

  it('activates the paywall indicator and 5-skill copy at 5/5', () => {
    h.freeSkills = '5/5';
    render(<OmniSkillsModule onClose={vi.fn()} />);
    expect(screen.getByText(/paywall active/i)).toBeInTheDocument();
    expect(screen.getByText(/5 free skills limit/i)).toBeInTheDocument();
  });

  it('does not advertise unlimited free skills', () => {
    h.freeSkills = '5/5';
    render(<OmniSkillsModule onClose={vi.fn()} />);
    expect(screen.queryByText(/unlimited free/i)).not.toBeInTheDocument();
  });

  it('"Forge New Skill" routes to the protected SkillForge page', () => {
    const onClose = vi.fn();
    render(<OmniSkillsModule onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /forge new skill/i }));
    expect(onClose).toHaveBeenCalled();
    expect(h.navigate).toHaveBeenCalledWith('/launch/skillforge');
  });
});
