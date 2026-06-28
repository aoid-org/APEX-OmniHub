import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';

import { ObservabilityToggle } from '../../apps/omnihub-site/dashboard/components/ObservabilityToggle';
import { useLayoutPersistence } from '../../apps/omnihub-site/dashboard/hooks/useLayoutPersistence';

const M03 = ['m03_1','m03_2','m03_3','m03_4','m03_5','m03_6','m03_7'];

describe('ObservabilityToggle — progressive disclosure affordance', () => {
  it('communicates collapsed state and reveal intent', () => {
    render(<ObservabilityToggle shown={false} panelCount={7} controlsId="m03-observability" onToggle={() => {}} />);
    const btn = screen.getByTestId('observability-toggle');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.getAttribute('aria-controls')).toBe('m03-observability');
    expect(btn.textContent).toContain('Show Observability');
    expect(btn.textContent).toContain('7 panels');
  });

  it('reflects expanded state', () => {
    render(<ObservabilityToggle shown panelCount={7} controlsId="m03-observability" onToggle={() => {}} />);
    const btn = screen.getByTestId('observability-toggle');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(btn.textContent).toContain('Hide Observability');
  });

  it('is a 44px+ touch target and fires onToggle', () => {
    const onToggle = vi.fn();
    render(<ObservabilityToggle shown={false} panelCount={7} controlsId="m03-observability" onToggle={onToggle} />);
    const btn = screen.getByTestId('observability-toggle') as HTMLButtonElement;
    expect(parseInt(btn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledOnce();
  });
});

describe('useLayoutPersistence.setGroupHidden — observability collapsed by default', () => {
  beforeEach(() => localStorage.clear());

  it('hides all M03 observability panels by default (reduced default canvas)', () => {
    const { result } = renderHook(() => useLayoutPersistence('test-user'));
    for (const id of M03) expect(result.current.hiddenWidgets).toContain(id);
  });

  it('reveals and re-collapses the whole group atomically', () => {
    const { result } = renderHook(() => useLayoutPersistence('test-user'));
    act(() => result.current.setGroupHidden(M03, false));
    for (const id of M03) expect(result.current.hiddenWidgets).not.toContain(id);
    act(() => result.current.setGroupHidden(M03, true));
    for (const id of M03) expect(result.current.hiddenWidgets).toContain(id);
  });

  it('is idempotent — re-hiding an already-hidden group keeps the same reference', () => {
    const { result } = renderHook(() => useLayoutPersistence('test-user'));
    const before = result.current.hiddenWidgets;
    act(() => result.current.setGroupHidden(M03, true));
    expect(result.current.hiddenWidgets).toBe(before);
  });

  it('persists revealed state across remounts', () => {
    const first = renderHook(() => useLayoutPersistence('persist-user'));
    act(() => first.result.current.setGroupHidden(M03, false));
    first.unmount();
    const second = renderHook(() => useLayoutPersistence('persist-user'));
    for (const id of M03) expect(second.result.current.hiddenWidgets).not.toContain(id);
  });
});
