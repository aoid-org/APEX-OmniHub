/**
 * ModuleShell honest action gating (PRCC-001 WP-3b/3c).
 *
 * Proves the single chokepoint for all module modals:
 *  - a stub action (no onAction handler + capability map = unsupported) renders
 *    DISABLED with the module's honest copy as its tooltip, and the badge
 *    downgrades from LIVE to PREVIEW;
 *  - a module that wires onAction keeps its buttons enabled and its LIVE badge;
 *  - a capability-supported action (automations:execute-automation) stays enabled
 *    even without onAction.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { OmniModuleState } from '@/hooks/useOmniModuleState';

// ModuleShell only pulls triggerModuleAction from the hook module.
vi.mock('@/hooks/useOmniModuleState', () => ({ triggerModuleAction: vi.fn() }));

import { ModuleShell } from '../../apps/omnihub-site/dashboard/components/modules/ModuleShell';

function stateWith(
  moduleKey: string,
  actions: readonly { id: string; label: string }[],
): OmniModuleState {
  return {
    moduleKey,
    headline: 'Module headline',
    stats: [],
    items: [],
    actions: actions as OmniModuleState['actions'],
    loading: false,
    error: null,
    stateKind: 'live',
  };
}

describe('ModuleShell honest gating (PRCC-001 WP-3b/3c)', () => {
  it('gates an unsupported action (no onAction): disabled + honest tooltip + PREVIEW badge', () => {
    render(
      <ModuleShell
        state={stateWith('physiomni', [{ id: 'sync-devices', label: 'Sync Devices' }])}
        onClose={vi.fn()}
      />,
    );
    const btn = screen.getByRole('button', { name: /sync devices/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('title')).toMatch(/not connected/i);
    expect(screen.getByText('PREVIEW')).toBeInTheDocument();
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
  });

  it('keeps buttons enabled and badge LIVE when the module wires onAction', () => {
    render(
      <ModuleShell
        state={stateWith('physiomni', [{ id: 'sync-devices', label: 'Sync Devices' }])}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />,
    );
    const btn = screen.getByRole('button', { name: /sync devices/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('keeps a capability-supported action enabled without onAction (automations:execute-automation)', () => {
    render(
      <ModuleShell
        state={stateWith('automations', [{ id: 'execute-automation', label: 'Execute Automation' }])}
        onClose={vi.fn()}
      />,
    );
    const btn = screen.getByRole('button', { name: /execute automation/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });
});
