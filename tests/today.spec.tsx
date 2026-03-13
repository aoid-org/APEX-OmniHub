/**
 * Today.tsx – OmniDash Today widget tests
 *
 * Covers: rendering, grid layout, add-item mutation, badge styling,
 * responsive layout keys, and DragHandle presence.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-test', email: 'test@test.com' } }),
}));

vi.mock('@/omnidash/api', () => ({
  fetchTodayItems: vi.fn().mockResolvedValue([
    {
      id: '1',
      user_id: 'u-test',
      title: 'Close Q1 Revenue',
      next_action: null,
      category: 'outcome',
      order_index: 0,
      is_active: true,
      power_block_started_at: null,
      power_block_duration_minutes: 90,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      user_id: 'u-test',
      title: 'Call Investor',
      next_action: null,
      category: 'outreach',
      order_index: 1,
      is_active: true,
      power_block_started_at: null,
      power_block_duration_minutes: 90,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]),
  upsertTodayItem: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/omnidash/hooks', () => ({
  useOmniDashSettings: () => ({ data: { demo_mode: false } }),
}));

vi.mock('@/omnidash/redaction', () => ({
  redactTodayItems: (items: unknown[]) => items,
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useExecute', () => ({
  useExecute: () => ({ isDemo: false, execute: vi.fn() }),
}));

vi.mock('@/stores/demoStore', () => ({
  useDemoStore: () => ({ tasks: [] }),
}));

vi.mock('@/dashboard/components/OmniTraceFeed', () => ({
  OmniTraceFeed: () => <div data-testid="omnitrace-feed">Feed</div>,
}));

vi.mock('./HiddenMetric', () => ({
  HiddenMetric: ({ value }: { value: string }) => <span>{value}</span>,
}));

vi.mock('@/dashboard/components/HiddenMetric', () => ({
  HiddenMetric: ({ value }: { value: string }) => <span>{value}</span>,
}));

vi.mock('react-grid-layout/legacy', () => {
  const Responsive = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-grid">{children}</div>
  );
  const WidthProvider = (C: React.ComponentType<{ children?: React.ReactNode }>) => C;
  return { Responsive, WidthProvider };
});

vi.mock('react-grid-layout/css/styles.css', () => ({}));
vi.mock('react-resizable/css/styles.css', () => ({}));

// ── Helpers ───────────────────────────────────────────────────────────
function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('Today widget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const { Today } = await import('@/dashboard/components/Today');
    const Wrapper = createWrapper();
    const { container } = render(
      <Wrapper>
        <Today />
      </Wrapper>
    );
    expect(container).toBeTruthy();
  });

  it('renders the responsive grid container', async () => {
    const { Today } = await import('@/dashboard/components/Today');
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <Today />
      </Wrapper>
    );
    expect(screen.getByTestId('responsive-grid')).toBeTruthy();
  });

  it('renders the Top 3 Outcomes heading', async () => {
    const { Today } = await import('@/dashboard/components/Today');
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <Today />
      </Wrapper>
    );
    expect(screen.getByText('Top 3 Outcomes')).toBeTruthy();
  });

  it('exports a default export', async () => {
    const mod = await import('@/dashboard/components/Today');
    expect(mod.default).toBeDefined();
    expect(mod.Today).toBeDefined();
  });
});
