/**
 * OmniSearchPalette — functional lock for the header "Search OmniHub…" bar.
 *
 * The bar shipped as a decorative div (no input, no handler) — this suite
 * pins the repaired contract:
 *   - palette opens, filters across all navigable surfaces (9 sidebar modules
 *     + OmniSkills), and keyword search matches (e.g. "payment" → Billing);
 *   - selecting a result routes through useOmniModal.invoke with the module's
 *     canonical moduleKey (same path the sidebar uses — no parallel nav);
 *   - Escape closes without invoking anything;
 *   - keyboard flow: ArrowDown/ArrowUp + Enter opens the highlighted result.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const invokeMock = vi.fn();
vi.mock('@/stores/omniModalStore', () => ({
  useOmniModal: Object.assign(vi.fn(), {
    getState: () => ({ invoke: invokeMock }),
  }),
}));

// The vitest '@/contracts' alias resolves to the root shim (empty array by
// design); pin the real 9-widget canon here so the index test is honest.
vi.mock('@/contracts/omnidash-sidebar-widgets', () => ({
  OMNIDASH_SIDEBAR_WIDGETS: [
    { id: 'omniboard', label: 'OmniBoard', iconIdx: 0, moduleKey: 'omniboard' },
    { id: 'physiomni', label: 'PhysiOmni', iconIdx: 5, moduleKey: 'physiomni' },
    { id: 'audits', label: 'Audits', iconIdx: 1, moduleKey: 'audits' },
    { id: 'links', label: 'Links', iconIdx: 4, moduleKey: 'links' },
    { id: 'automations', label: 'Automations', iconIdx: 7, moduleKey: 'automations' },
    { id: 'workflows', label: 'Workflows', iconIdx: 6, moduleKey: 'workflows' },
    { id: 'files', label: 'Files', iconIdx: 8, moduleKey: 'files' },
    { id: 'billing', label: 'Billing', iconIdx: 3, moduleKey: 'billing' },
    { id: 'settings', label: 'Settings', iconIdx: 2, moduleKey: 'settings' },
  ],
}));

import {
  OmniSearchPalette,
  buildSearchTargets,
  filterSearchTargets,
} from '../../apps/omnihub-site/dashboard/components/OmniSearchPalette';

describe('search target index', () => {
  it('covers all 9 canonical sidebar modules plus OmniSkills', () => {
    const targets = buildSearchTargets();
    expect(targets).toHaveLength(10);
    const keys = targets.map((t) => t.key);
    for (const k of [
      'omniboard', 'physiomni', 'audits', 'links', 'automations',
      'workflows', 'files', 'billing', 'settings', 'omniskills',
    ]) {
      expect(keys).toContain(k);
    }
  });

  it('matches by label and by keyword, case-insensitively', () => {
    const targets = buildSearchTargets();
    expect(filterSearchTargets(targets, 'BILL').map((t) => t.key)).toEqual(['billing']);
    expect(filterSearchTargets(targets, 'payment').map((t) => t.key)).toEqual(['billing']);
    expect(filterSearchTargets(targets, 'upload').map((t) => t.key)).toEqual(['files']);
    expect(filterSearchTargets(targets, '')).toHaveLength(10);
    expect(filterSearchTargets(targets, 'zzz-no-match')).toHaveLength(0);
  });
});

describe('OmniSearchPalette', () => {
  beforeEach(() => {
    invokeMock.mockClear();
  });

  it('renders nothing when closed', () => {
    render(<OmniSearchPalette open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('omni-search-overlay')).toBeNull();
  });

  it('filters results and opens the clicked module via useOmniModal', () => {
    const onClose = vi.fn();
    render(<OmniSearchPalette open onClose={onClose} />);

    fireEvent.change(screen.getByTestId('omni-search-input'), {
      target: { value: 'invoice' },
    });
    fireEvent.click(screen.getByTestId('omni-search-result-billing'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock.mock.calls[0][0]).toMatchObject({
      provider: 'omnidash',
      type: 'module',
      title: 'Billing',
      contextData: { moduleKey: 'billing' },
    });
  });

  it('shows an honest empty state on no match', () => {
    render(<OmniSearchPalette open onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId('omni-search-input'), {
      target: { value: 'zzz-no-match' },
    });
    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByText(/No OmniHub surface matches/i)).toBeTruthy();
  });

  it('Escape closes without invoking any module', () => {
    const onClose = vi.fn();
    render(<OmniSearchPalette open onClose={onClose} />);
    fireEvent.keyDown(screen.getByTestId('omni-search-input'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('ArrowDown + Enter opens the second result', () => {
    render(<OmniSearchPalette open onClose={vi.fn()} />);
    const input = screen.getByTestId('omni-search-input');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    const second = buildSearchTargets()[1];
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock.mock.calls[0][0]).toMatchObject({
      contextData: { moduleKey: second.moduleKey },
    });
  });
});
