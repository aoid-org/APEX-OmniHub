/**
 * Today widget — TodayDragHandle coverage
 *
 * The Today component is the only consumer of TodayDragHandle (the
 * text-white/20 variant of DragHandle).  These tests render Today with all
 * its external dependencies mocked so that the new TodayDragHandle wrapper
 * lines are exercised and SonarCloud sees them as covered.
 */

import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Auth ──────────────────────────────────────────────────────────────────────
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'u-today', email: 'today@apex.test' },
  })),
}));

// ── API & hooks ───────────────────────────────────────────────────────────────
vi.mock('@/omnidash/api', () => ({
  fetchTodayItems: vi.fn().mockResolvedValue([]),
  upsertTodayItem: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/omnidash/hooks', () => ({
  useOmniDashSettings: vi.fn(() => ({
    data: { demo_mode: false, anonymize_kpis: false },
  })),
}));

vi.mock('@/omnidash/redaction', () => ({
  redactTodayItems: vi.fn((x) => x),
}));

// ── Toast / execute / demo store ──────────────────────────────────────────────
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useExecute', () => ({
  useExecute: () => ({ isDemo: false, execute: vi.fn() }),
}));

vi.mock('@/stores/demoStore', () => ({
  useDemoStore: () => ({
    items: [],
    addItem: vi.fn(),
    completeItem: vi.fn(),
    completeAll: vi.fn(),
  }),
}));

// ── Sub-components ────────────────────────────────────────────────────────────
vi.mock('@/components/dashboard/OmniTraceFeed', () => ({
  OmniTraceFeed: () => <div data-testid="omni-trace-feed" />,
}));

vi.mock('@/components/omnidash/HiddenMetric', () => ({
  HiddenMetric: ({ value }: { value: unknown }) => <span>{String(value)}</span>,
}));

// ApexAgentAvatar is lazy-loaded; provide a synchronous stub so Suspense resolves
vi.mock('@/components/omnidash/ApexAgentAvatar', () => ({
  default: () => <div data-testid="apex-avatar" />,
}));

// react-grid-layout: simple passthrough so children render without DOM measurement
vi.mock('react-grid-layout/legacy', () => ({
  WidthProvider: (Component: React.ComponentType) => Component,
  Responsive: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { Today } from '@/components/omnidash/Today';

function renderToday() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Suspense fallback={<div>loading</div>}>
        <Today />
      </Suspense>
    </QueryClientProvider>,
  );
}

describe('Today — TodayDragHandle coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Today without throwing', () => {
    expect(() => renderToday()).not.toThrow();
  });

  it('mounts the custom-drag-handle elements used by react-grid-layout', () => {
    const { container } = renderToday();
    // TodayDragHandle renders at least one .custom-drag-handle
    const handles = container.querySelectorAll('.custom-drag-handle');
    expect(handles.length).toBeGreaterThan(0);
  });

  it('applies text-white/20 base colour to TodayDragHandle (distinct from default variant)', () => {
    const { container } = renderToday();
    const handle = container.querySelector('.custom-drag-handle') as HTMLElement;
    expect(handle.className).toContain('text-white/20');
  });

  it('renders DragHandle SVG circles inside Today widget', () => {
    const { container } = renderToday();
    const circles = container.querySelectorAll('.custom-drag-handle circle');
    expect(circles.length).toBeGreaterThan(0);
  });
});
