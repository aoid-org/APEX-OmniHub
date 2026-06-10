import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    <a href={to}>{children}</a>,
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('@/dashboard/components/NotificationCenter', () => ({
  NotificationCenter: () => <div data-testid="notification-center" />,
}));

vi.mock('@/dashboard/components/PersonaModal', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <div data-testid="persona-modal"><button onClick={onClose}>close-modal</button></div> : null,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    asChild ? children : <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    asChild ? children : <div>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    asChild?: boolean;
    [key: string]: unknown;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return children;
    }
    return <button type="button" onClick={onClick} {...props}>{children}</button>;
  },
}));

vi.mock('@/omnidash/agentPrefs', () => ({
  readAgentPrefs: vi.fn(() => ({ persona: 'Operator' })),
  writeAgentPrefs: vi.fn(),
}));

import { OmniDashTopHeader } from '../../apps/omnihub-site/dashboard/components/TopHeader';

describe('OmniDashTopHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the component with testid', () => {
    render(<OmniDashTopHeader />);
    expect(screen.getByTestId('omnidash-top-header')).toBeTruthy();
  });

  it('renders APEX OmniDash logo text', () => {
    render(<OmniDashTopHeader />);
    expect(screen.getByText('APEX OmniDash')).toBeTruthy();
  });

  it('renders global search input', () => {
    render(<OmniDashTopHeader />);
    expect(screen.getByTestId('global-search-input')).toBeTruthy();
  });

  it('renders organization badge input with default value', () => {
    render(<OmniDashTopHeader />);
    const badge = screen.getByTestId('organization-badge-input') as HTMLInputElement;
    expect(badge.value).toBe('APEX Org');
  });

  it('updates org badge when typed', () => {
    render(<OmniDashTopHeader />);
    const badge = screen.getByTestId('organization-badge-input') as HTMLInputElement;
    fireEvent.change(badge, { target: { value: 'My Corp' } });
    expect(badge.value).toBe('My Corp');
  });

  it('renders Connect AI link', () => {
    render(<OmniDashTopHeader />);
    expect(screen.getByText('Connect AI')).toBeTruthy();
  });

  it('renders notification center', () => {
    render(<OmniDashTopHeader />);
    expect(screen.getByTestId('notification-center')).toBeTruthy();
  });

  it('renders persona trigger button', () => {
    render(<OmniDashTopHeader />);
    expect(screen.getByTestId('persona-trigger')).toBeTruthy();
  });

  it('opens persona modal on persona trigger click', () => {
    render(<OmniDashTopHeader />);
    fireEvent.click(screen.getByTestId('persona-trigger'));
    expect(screen.getByTestId('persona-modal')).toBeTruthy();
  });

  it('closes persona modal', () => {
    render(<OmniDashTopHeader />);
    fireEvent.click(screen.getByTestId('persona-trigger'));
    fireEvent.click(screen.getByText('close-modal'));
    expect(screen.queryByTestId('persona-modal')).toBeNull();
  });

  it('renders user menu trigger with initials from userEmail', () => {
    render(<OmniDashTopHeader userEmail="alice@example.com" />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('renders user menu trigger with U when no email', () => {
    render(<OmniDashTopHeader />);
    expect(screen.getByText('U')).toBeTruthy();
  });

  it('stores org badge in localStorage on change', () => {
    render(<OmniDashTopHeader />);
    const badge = screen.getByTestId('organization-badge-input');
    fireEvent.change(badge, { target: { value: 'APEX Inc' } });
    expect(localStorage.getItem('apex.org.badge.v1')).toBe('APEX Inc');
  });
});
