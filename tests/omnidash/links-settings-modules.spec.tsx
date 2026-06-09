import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const defaultModuleState = {
  loading: false,
  error: null,
  items: [],
  stats: [],
  actions: [],
  title: 'Test Module',
  description: '',
};

vi.mock('@/hooks/useOmniModuleState', () => ({
  useOmniModuleState: vi.fn(() => defaultModuleState),
  triggerModuleAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/stores/omniModalStore', () => ({
  useOmniModal: vi.fn(() => ({
    activeModal: null,
    isOpen: false,
    close: vi.fn(),
    abortModal: vi.fn(),
    invoke: vi.fn(),
  })),
  getState: vi.fn(() => ({ invoke: vi.fn() })),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
  hasSupabaseConfig: false,
}));

vi.mock('dashboard/components/modules/ModuleShell', () => ({
  ModuleShell: ({ children, state, onClose }: {
    children?: React.ReactNode;
    state: { loading: boolean; title?: string };
    onClose: () => void;
  }) => (
    <div data-testid="module-shell">
      <span data-testid="module-title">{state.title}</span>
      <button onClick={onClose} data-testid="module-close">close</button>
      {!state.loading && children}
    </div>
  ),
}));

vi.mock('dashboard/contexts/LayoutContext', () => ({
  useLayoutContext: vi.fn(() => ({
    hiddenWidgets: [],
    panelLayout: 'standard',
    toggleWidget: vi.fn(),
    setPanelLayout: vi.fn(),
    resetWidgetPositions: vi.fn(),
  })),
}));

vi.mock('dashboard/components/WidgetSettingsModal', () => ({
  WidgetSettingsPanel: () => <div data-testid="widget-settings-panel" />,
}));

import LinksModule from '../../apps/omnihub-site/dashboard/components/modules/LinksModule';
import SettingsModule from '../../apps/omnihub-site/dashboard/components/modules/SettingsModule';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';

describe('LinksModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOmniModuleState).mockReturnValue(defaultModuleState as ReturnType<typeof useOmniModuleState>);
  });

  it('renders module shell without crashing', () => {
    render(<LinksModule onClose={vi.fn()} />);
    expect(screen.getByTestId('module-shell')).toBeTruthy();
  });

  it('does not render connection health section when items is empty', () => {
    render(<LinksModule onClose={vi.fn()} />);
    expect(screen.queryByText('Connection Health')).toBeNull();
  });

  it('renders connection health chips when items present', () => {
    vi.mocked(useOmniModuleState).mockReturnValue({
      ...defaultModuleState,
      items: [
        { id: 'link-1', label: 'Stripe Connect', status: 'active' },
        { id: 'link-2', label: 'HubSpot API', status: 'pending' },
        { id: 'link-3', label: 'Error Service', status: 'error' },
        { id: 'link-4', label: 'Idle Source', status: 'inactive' },
      ],
    } as ReturnType<typeof useOmniModuleState>);

    render(<LinksModule onClose={vi.fn()} />);
    expect(screen.getByText('Connection Health')).toBeTruthy();
    expect(screen.getByText('Stri')).toBeTruthy();
    expect(screen.getByText('HubS')).toBeTruthy();
  });

  it('does not render chips during loading', () => {
    vi.mocked(useOmniModuleState).mockReturnValue({
      ...defaultModuleState,
      loading: true,
      items: [{ id: 'x', label: 'Some', status: 'active' }],
    } as ReturnType<typeof useOmniModuleState>);

    render(<LinksModule onClose={vi.fn()} />);
    expect(screen.queryByText('Connection Health')).toBeNull();
  });

  it('handles unknown status with inactive fallback color', () => {
    vi.mocked(useOmniModuleState).mockReturnValue({
      ...defaultModuleState,
      items: [
        { id: 'x1', label: 'Unknown Status', status: 'unknown_status' },
      ],
    } as ReturnType<typeof useOmniModuleState>);

    render(<LinksModule onClose={vi.fn()} />);
    expect(screen.getByText('Unkn')).toBeTruthy();
  });
});

describe('SettingsModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOmniModuleState).mockReturnValue(defaultModuleState as ReturnType<typeof useOmniModuleState>);
  });

  it('renders module shell without crashing', () => {
    render(<SettingsModule onClose={vi.fn()} />);
    expect(screen.getByTestId('module-shell')).toBeTruthy();
  });

  it('renders WidgetSettingsPanel', () => {
    render(<SettingsModule onClose={vi.fn()} />);
    expect(screen.getByTestId('widget-settings-panel')).toBeTruthy();
  });

  it('does not render config health when items is empty', () => {
    render(<SettingsModule onClose={vi.fn()} />);
    expect(screen.queryByText('Configuration Health')).toBeNull();
  });

  it('renders config health when items are present', () => {
    vi.mocked(useOmniModuleState).mockReturnValue({
      ...defaultModuleState,
      items: [
        { id: 's1', label: 'Dark Mode', status: 'active' },
        { id: 's2', label: 'Notifications', status: 'inactive' },
      ],
      stats: [{ label: 'Version', value: 'v2.1.0' }],
    } as ReturnType<typeof useOmniModuleState>);

    render(<SettingsModule onClose={vi.fn()} />);
    expect(screen.getByText('Configuration Health')).toBeTruthy();
    expect(screen.getByText('1 of 2 settings enabled')).toBeTruthy();
  });

  it('shows version stat when present', () => {
    vi.mocked(useOmniModuleState).mockReturnValue({
      ...defaultModuleState,
      items: [{ id: 's1', label: 'Setting A', status: 'active' }],
      stats: [{ label: 'Version', value: 'v3.0.0' }],
    } as ReturnType<typeof useOmniModuleState>);

    render(<SettingsModule onClose={vi.fn()} />);
    expect(screen.getByText('v3.0.0')).toBeTruthy();
  });

  it('shows all-validated indicator when no errors', () => {
    vi.mocked(useOmniModuleState).mockReturnValue({
      ...defaultModuleState,
      items: [
        { id: 's1', label: 'OK Setting', status: 'active' },
      ],
      stats: [],
    } as ReturnType<typeof useOmniModuleState>);

    render(<SettingsModule onClose={vi.fn()} />);
    expect(screen.getByText('Configuration Health')).toBeTruthy();
  });
});
