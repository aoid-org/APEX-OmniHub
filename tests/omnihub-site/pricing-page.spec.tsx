import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';

const { mockInvoke, mockUseAuth } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: mockInvoke } },
  hasSupabaseConfig: true,
}));

vi.mock('@/lib/useAuth', () => ({
  useAuth: mockUseAuth,
}));

// Layout pulls in siteConfig/i18n/auth-aware nav — out of scope for this spec.
vi.mock('../../apps/omnihub-site/src/components/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../apps/omnihub-site/src/components/SEOMeta', () => ({
  SEOMeta: () => null,
}));

import { PricingPage } from '../../apps/omnihub-site/src/pages/Pricing';

describe('PricingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ session: {}, loading: false, isAuthenticated: true });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://apexomnihub.icu', assign: vi.fn() },
    });
  });

  it('renders all three plan tiers and the billing portal entry', () => {
    render(<PricingPage />);
    expect(screen.getByTestId('pricing-plan-basic')).toBeInTheDocument();
    expect(screen.getByTestId('pricing-plan-pro')).toBeInTheDocument();
    expect(screen.getByTestId('pricing-plan-bus')).toBeInTheDocument();
    expect(screen.getByTestId('pricing-billing-portal')).toBeInTheDocument();
  });

  it('starts a PRO checkout and opens only the returned Stripe checkout URL', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: true, data: { url: 'https://checkout.stripe.com/c/pay/test_123' } },
      error: null,
    });

    render(<PricingPage />);
    fireEvent.click(screen.getByRole('button', { name: /upgrade to pro/i }));

    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('create-checkout', {
      body: { tier: 'PRO', skills: [], returnUrl: 'https://apexomnihub.icu' },
    }));
    await waitFor(() =>
      expect(window.location.assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/test_123'));
  });

  it('refuses a non-Stripe checkout URL and opens nothing', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: true, data: { url: 'https://evil.example.com/pay' } },
      error: null,
    });

    render(<PricingPage />);
    fireEvent.click(screen.getByRole('button', { name: /upgrade to business/i }));

    await waitFor(() => expect(mockInvoke).toHaveBeenCalled());
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('sends unauthenticated users to /login without invoking checkout', () => {
    mockUseAuth.mockReturnValue({ session: null, loading: false, isAuthenticated: false });

    render(<PricingPage />);
    fireEvent.click(screen.getByRole('button', { name: /upgrade to pro/i }));

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(window.location.assign).toHaveBeenCalledWith('/login');
  });

  it('routes the free Base tier to /launch onboarding', () => {
    render(<PricingPage />);
    fireEvent.click(screen.getByRole('button', { name: /initialize base/i }));

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(window.location.assign).toHaveBeenCalledWith('/launch');
  });

  it('opens only a billing.stripe.com URL from the billing portal button', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: true, data: { url: 'https://billing.stripe.com/session/test_456' } },
      error: null,
    });

    render(<PricingPage />);
    fireEvent.click(screen.getByTestId('pricing-billing-portal'));

    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('create-billing-portal', {
      body: { returnUrl: 'https://apexomnihub.icu' },
    }));
    await waitFor(() =>
      expect(window.location.assign).toHaveBeenCalledWith('https://billing.stripe.com/session/test_456'));
  });
});
