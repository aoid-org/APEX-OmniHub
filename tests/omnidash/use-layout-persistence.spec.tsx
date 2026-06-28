import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLayoutPersistence } from '../../apps/omnihub-site/dashboard/hooks/useLayoutPersistence';
import {
  LAYOUT_STORAGE_KEY,
  DEFAULT_PERSISTED_LAYOUT,
} from '../../apps/omnihub-site/dashboard/types/dashboard.types';

describe('useLayoutPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns default state when localStorage is empty', () => {
    const { result } = renderHook(() => useLayoutPersistence());
    expect(result.current.activeNav).toBe('Home');
    expect(result.current.isDark).toBe(true);
    expect(result.current.panelLayout).toBe('standard');
  });

  it('hydrates state from localStorage on mount', () => {
    localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        activeNav: 'Audits',
        isDark: false,
        ops: { demo: false, autoPilot: true, guardian: false, live: true },
        panelLayout: 'reversed',
        hiddenWidgets: ['widget_eco'],
      }),
    );
    const { result } = renderHook(() => useLayoutPersistence());
    expect(result.current.activeNav).toBe('Audits');
    expect(result.current.isDark).toBe(false);
    expect(result.current.panelLayout).toBe('reversed');
    expect(result.current.hiddenWidgets).toContain('widget_eco');
  });

  it('falls back to defaults when localStorage has invalid JSON', () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, 'not-valid-json{{{');
    const { result } = renderHook(() => useLayoutPersistence());
    expect(result.current.activeNav).toBe(DEFAULT_PERSISTED_LAYOUT.activeNav);
  });

  it('uses default hiddenWidgets when stored value is not an array', () => {
    localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({ hiddenWidgets: 'invalid' }),
    );
    const { result } = renderHook(() => useLayoutPersistence());
    expect(Array.isArray(result.current.hiddenWidgets)).toBe(true);
  });

  it('defaults panelLayout to standard when stored value is unknown', () => {
    localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({ panelLayout: 'sideways' }),
    );
    const { result } = renderHook(() => useLayoutPersistence());
    expect(result.current.panelLayout).toBe('standard');
  });

  it('uses per-user storage key when userId provided', () => {
    const { result } = renderHook(() => useLayoutPersistence('user-123'));
    act(() => { result.current.setIsDark(false); });
    const stored = localStorage.getItem(`${LAYOUT_STORAGE_KEY}:user-123`);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).isDark).toBe(false);
  });

  it('toggleWidget adds a widget to hiddenWidgets', () => {
    const { result } = renderHook(() => useLayoutPersistence());
    act(() => { result.current.toggleWidget('widget_agent'); });
    expect(result.current.hiddenWidgets).toContain('widget_agent');
  });

  it('toggleWidget removes a widget already in hiddenWidgets', () => {
    localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_PERSISTED_LAYOUT, hiddenWidgets: ['widget_agent'] }),
    );
    const { result } = renderHook(() => useLayoutPersistence());
    act(() => { result.current.toggleWidget('widget_agent'); });
    expect(result.current.hiddenWidgets).not.toContain('widget_agent');
  });

  it('setPanelLayout updates panelLayout state', () => {
    const { result } = renderHook(() => useLayoutPersistence());
    act(() => { result.current.setPanelLayout('reversed'); });
    expect(result.current.panelLayout).toBe('reversed');
  });

  it('resetWidgetPositions removes both legacy and new layout keys from localStorage', () => {
    localStorage.setItem('omni_widget_pos_widget_agent', JSON.stringify({ x: 100, y: 200 }));
    localStorage.setItem('omni_widget_pos_widget_eco', JSON.stringify({ x: 50, y: 50 }));
    localStorage.setItem('omnidash_layout_v2:user1:desktop', JSON.stringify({ a: { x: 1, y: 1 } }));
    localStorage.setItem('other_key', 'keep-me');
    const { result } = renderHook(() => useLayoutPersistence());
    act(() => { result.current.resetWidgetPositions(); });
    expect(localStorage.getItem('omni_widget_pos_widget_agent')).toBeNull();
    expect(localStorage.getItem('omni_widget_pos_widget_eco')).toBeNull();
    expect(localStorage.getItem('omnidash_layout_v2:user1:desktop')).toBeNull();
    expect(localStorage.getItem('other_key')).toBe('keep-me');
  });

  it('persists state to localStorage on change', () => {
    const { result } = renderHook(() => useLayoutPersistence());
    act(() => { result.current.setActiveNav('Pipeline'); });
    const stored = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY)!);
    expect(stored.activeNav).toBe('Pipeline');
  });

  it('applies theme to document dataset on mount', () => {
    renderHook(() => useLayoutPersistence());
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('updates theme dataset when isDark changes', () => {
    const { result } = renderHook(() => useLayoutPersistence());
    act(() => { result.current.setIsDark(false); });
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
