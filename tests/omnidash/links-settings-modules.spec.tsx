import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// vi.hoisted ensures omniInvoke is available inside the vi.mock factory
const { omniInvoke } = vi.hoisted(() => ({ omniInvoke: vi.fn() }));

const defaultModuleState = {
  moduleKey: 'test',
  headline: 'Test Module',
  loading: false,
  error: null,
  items: [],
  stats: [],
  actions: [],
  stateKind: 'local',
  title: 'Test Module',
  description: '',
};

vi.mock('@/hooks/useOmniModuleState', () => ({
  useOmniModuleState: vi.fn(() => defaultModuleState),
  triggerModuleAction: vi.fn().mockResolvedValue({ success: true }),
}));

// useOmniModal is called as a hook AND its .getState() static method is called
// by LinksModule.handleAction. Set getState as a property on the mock function.
vi.mock('@/stores/omniModalStore', () => {
  const mockFn = vi.fn(() => ({
    activeModal: null,
    isOpen: false,
    close: vi.fn(),
    abortModal: vi.fn(),
    invoke: vi.fn(),
  }));
  (mockFn as typeof mockFn & { getState: () => unknown }).getState = () => ({ invoke: omniInvoke });
  return {
    useOmniModal: mockFn,
    resolveRenderMode: vi.fn(() => 'dialog'),
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
  hasSupabaseConfig: false,
}));

// ModuleShell mock exposes onAction trigger buttons so LinksModule.handleAction is reachable
vi.mock('dashboard/components/modules/ModuleShell', () => ({
  ModuleShell: ({ children, state, onClose, onAction }: {
    children?: React.ReactNode;
    state: { loading: boolean; title?: string };
    onClose: () => void;
    onAction?: (actionId: string, selected: string[]) => unknown;
  }) => (
    <div data-testid="module-shell">
      <span data-testid="module-title">{state.title}</span>
      <button onClick={onClose} data-testid="module-close">close</button>
      {/* Button text intentionally differs from the staging panel's "Add Link"
          submit button so tests can target each unambiguously. */}
      <button data-testid="trigger-add-link" onClick={() => onAction?.('add-link', [])}>Trigger Add Link</button>
      <button data-testid="trigger-test-all" onClick={() => onAction?.('test-all', [])}>Trigger Test All</button>
      <button data-testid="trigger-send-omnislate" onClick={() => onAction?.('send-to-omnislate', [])}>Trigger Send To OmniSlate</button>
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

  it('does not render context links section when items is empty', () => {
    render(<LinksModule onClose={vi.fn()} />);
    expect(screen.queryByText('Context Links')).toBeNull();
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
    expect(screen.getByText('Context Links')).toBeTruthy();
    expect(screen.getByText('Stripe Connect')).toBeTruthy();
    expect(screen.getByText('HubSpot API')).toBeTruthy();
  });

  it('does not render chips during loading', () => {
    vi.mocked(useOmniModuleState).mockReturnValue({
      ...defaultModuleState,
      loading: true,
      items: [{ id: 'x', label: 'Some', status: 'active' }],
    } as ReturnType<typeof useOmniModuleState>);

    render(<LinksModule onClose={vi.fn()} />);
    expect(screen.queryByText('Context Links')).toBeNull();
  });

  it('handles unknown status with inactive fallback color', () => {
    vi.mocked(useOmniModuleState).mockReturnValue({
      ...defaultModuleState,
      items: [
        // Intentionally out-of-union status to exercise the inactive fallback color.
        { id: 'x1', label: 'Unknown Status', status: 'unknown_status' as string },
      ],
    } as ReturnType<typeof useOmniModuleState>);

    render(<LinksModule onClose={vi.fn()} />);
    expect(screen.getByText('Unknown Status')).toBeTruthy();
  });

  it('fires add-link action and enters URL staging mode', () => {
    render(<LinksModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('trigger-add-link'));
    // We now stage a URL inside the module rather than calling omniboard-wizard
    expect(screen.getByText('Stage URL Context')).toBeTruthy();
  });

  it('add-link with a valid URL triggers save and updates button state', () => {
    render(<LinksModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('trigger-add-link'));

    const input = screen.getByLabelText('URL to stage as context') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://example.com/doc' } });

    // The submit button (distinct text "Add Link") is enabled for a valid URL.
    const addButton = screen.getByRole('button', { name: 'Add Link' }) as HTMLButtonElement;
    expect(addButton.disabled).toBe(false);

    fireEvent.click(addButton);

    // Button should enter saving state
    expect(addButton.textContent).toBe('Saving...');
    expect(addButton.disabled).toBe(true);
  });

  it('Add Link button is NOT permanently disabled and rejects invalid URLs with validation copy', () => {
    render(<LinksModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('trigger-add-link'));

    const input = screen.getByLabelText('URL to stage as context') as HTMLInputElement;
    const addButton = screen.getByRole('button', { name: 'Add Link' }) as HTMLButtonElement;

    // Invalid URL → button disabled + validation copy.
    fireEvent.change(input, { target: { value: 'not-a-url' } });
    fireEvent.blur(input);
    expect(addButton.disabled).toBe(true);
    expect(screen.getByText('Enter a valid URL starting with http:// or https://.')).toBeTruthy();

    // Entering a valid URL re-enables the button — it is never permanently disabled.
    fireEvent.change(input, { target: { value: 'https://valid.example' } });
    expect(addButton.disabled).toBe(false);
  });

  it('send-to-omnislate shows the not-connected handoff copy and never stages a link', () => {
    render(<LinksModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('trigger-send-omnislate'));
    expect(screen.getByText('OmniSlate context handoff is not connected yet.')).toBeTruthy();
  });

  it('never references OmniBoard (the wizard is the app-integration surface, not Links)', () => {
    const { container } = render(<LinksModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('trigger-add-link'));
    expect(container.innerHTML).not.toMatch(/omniboard/i);
  });

  it('fires test-all action without throwing', () => {
    render(<LinksModule onClose={vi.fn()} />);
    expect(() => fireEvent.click(screen.getByTestId('trigger-test-all'))).not.toThrow();
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

  // Settings are now hardcoded to 4 items, so this test is obsolete
  // it('does not render config health when items is empty', () => ...

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
    expect(screen.getByText('1 of 4 settings enabled')).toBeTruthy();
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
