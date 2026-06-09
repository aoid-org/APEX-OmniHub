import { describe, it, expect } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import React from 'react';
import {
  LayoutContext,
  useLayoutContext,
} from '../../apps/omnihub-site/dashboard/contexts/LayoutContext';
import type { LayoutContextValue } from '../../apps/omnihub-site/dashboard/contexts/LayoutContext';

const mockValue: LayoutContextValue = {
  hiddenWidgets: [],
  panelLayout: 'standard',
  toggleWidget: () => {},
  setPanelLayout: () => {},
  resetWidgetPositions: () => {},
};

describe('LayoutContext', () => {
  it('useLayoutContext throws when used outside provider', () => {
    expect(() => renderHook(() => useLayoutContext())).toThrow(
      'useLayoutContext must be used inside LayoutContext.Provider',
    );
  });

  it('useLayoutContext returns context value when inside provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LayoutContext.Provider value={mockValue}>{children}</LayoutContext.Provider>
    );
    const { result } = renderHook(() => useLayoutContext(), { wrapper });
    expect(result.current.panelLayout).toBe('standard');
    expect(result.current.hiddenWidgets).toEqual([]);
  });

  it('context default value is null (unprovided)', () => {
    const { result } = renderHook(() => {
      const ctx = React.useContext(LayoutContext);
      return ctx;
    });
    expect(result.current).toBeNull();
  });

  it('provider passes value down correctly', () => {
    const { getByTestId } = render(
      <LayoutContext.Provider value={mockValue}>
        <div data-testid="child" />
      </LayoutContext.Provider>,
    );
    expect(getByTestId('child')).toBeTruthy();
  });

  it('reversed panelLayout is passed through', () => {
    const reversed: LayoutContextValue = { ...mockValue, panelLayout: 'reversed' };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LayoutContext.Provider value={reversed}>{children}</LayoutContext.Provider>
    );
    const { result } = renderHook(() => useLayoutContext(), { wrapper });
    expect(result.current.panelLayout).toBe('reversed');
  });
});
