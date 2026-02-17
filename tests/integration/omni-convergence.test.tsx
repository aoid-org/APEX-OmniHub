import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React, { type ReactNode } from 'react';
import { loadSkill } from '../../src/core/skills/SkillRegistry';
import { OmniLinkShell } from '../../src/layouts/OmniLinkShell';

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));

vi.mock('../../src/components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="mock-dashboard-layout">{children}</div>
  ),
}));

describe('Omni Convergence Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: Financial firewall is injected into loaded skills', () => {
    const skill = loadSkill('apex-support');
    expect(skill.systemPrompt).toContain('STRICTLY FORBIDDEN from accessing... financial data');
  });

  it('Test 2: OmniLinkShell renders with correct testid', () => {
    render(
      <BrowserRouter>
        <OmniLinkShell>
          <div>Test Content</div>
        </OmniLinkShell>
      </BrowserRouter>,
    );

    expect(screen.getByTestId('omnilink-shell')).toBeInTheDocument();
  });

  it('Test 3: OmniSupportWidget is rendered within shell', () => {
    render(
      <BrowserRouter>
        <OmniLinkShell>
          <div>Test Content</div>
        </OmniLinkShell>
      </BrowserRouter>,
    );

    expect(screen.getByTestId('omni-support-widget')).toBeInTheDocument();
  });
});
