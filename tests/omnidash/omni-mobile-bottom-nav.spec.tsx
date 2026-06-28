import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  OmniMobileBottomNav,
  type MobileTab,
} from '../../apps/omnihub-site/dashboard/components/OmniMobileBottomNav';

const TABS: MobileTab[] = ['home', 'slate', 'apps', 'insights', 'more'];

describe('OmniMobileBottomNav', () => {
  it('renders all 5 tab buttons', () => {
    const setActiveTab = vi.fn();
    render(<OmniMobileBottomNav activeTab="home" onSelect={setActiveTab} />);
    TABS.forEach((tab) => {
      const button = screen.getByRole('tab', { name: new RegExp(tab, 'i') });
      expect(button).toBeTruthy();
    });
  });

  it('marks the active tab as selected', () => {
    const setActiveTab = vi.fn();
    render(<OmniMobileBottomNav activeTab="slate" onSelect={setActiveTab} />);
    const slateTab = screen.getByRole('tab', { name: /slate/i });
    expect(slateTab).toHaveAttribute('aria-selected', 'true');
  });

  it.each(TABS)('exposes exactly one active tab when "%s" is selected', (tab) => {
    const setActiveTab = vi.fn();
    render(<OmniMobileBottomNav activeTab={tab} setActiveTab={setActiveTab} />);

    const selectedTabs = screen.getAllByRole('tab').filter((button) =>
      button.getAttribute('aria-selected') === 'true',
    );

    expect(selectedTabs).toHaveLength(1);
    expect(selectedTabs[0]).toHaveAccessibleName(new RegExp(tab, 'i'));
  });

  it('marks inactive tabs as not selected', () => {
    const setActiveTab = vi.fn();
    render(<OmniMobileBottomNav activeTab="home" onSelect={setActiveTab} />);
    const appsTab = screen.getByRole('tab', { name: /^apps$/i });
    expect(appsTab).toHaveAttribute('aria-selected', 'false');
  });

  it('calls setActiveTab when a tab is clicked', () => {
    const setActiveTab = vi.fn();
    render(<OmniMobileBottomNav activeTab="home" onSelect={setActiveTab} />);
    fireEvent.click(screen.getByRole('tab', { name: /insights/i }));
    expect(setActiveTab).toHaveBeenCalledWith('insights');
  });

  it('renders active indicator only for active tab', () => {
    const setActiveTab = vi.fn();
    const { container } = render(
      <OmniMobileBottomNav activeTab="more" onSelect={setActiveTab} />,
    );
    const indicators = container.querySelectorAll('.omni-mobile-tab__indicator');
    expect(indicators).toHaveLength(1);
  });

  it('renders each tab with its label text', () => {
    const setActiveTab = vi.fn();
    render(<OmniMobileBottomNav activeTab="apps" onSelect={setActiveTab} />);
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Slate')).toBeTruthy();
    expect(screen.getByText('Apps')).toBeTruthy();
    expect(screen.getByText('Insights')).toBeTruthy();
    expect(screen.getByText('More')).toBeTruthy();
  });

  it.each(TABS)('active tab "%s" renders with active class', (tab) => {
    const setActiveTab = vi.fn();
    const { container } = render(
      <OmniMobileBottomNav activeTab={tab} onSelect={setActiveTab} />,
    );
    const activeButton = container.querySelector('.omni-mobile-tab--active');
    expect(activeButton).toBeTruthy();
  });
});
