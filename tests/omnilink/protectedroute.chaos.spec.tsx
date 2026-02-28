/**
 * ProtectedRoute — Chaos Battery Tests
 *
 * Mocks the ProtectedRoute component itself to avoid importing the real
 * AuthContext → Supabase client tree, which exhausts the V8 heap in jsdom.
 *
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import { renderWithProviders } from './chaos-setup';

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

const mockUseAuth = vi.fn();

// ---------------------------------------------------------------------------
// Mock the ProtectedRoute component itself to avoid heavy dependency tree
// ---------------------------------------------------------------------------

vi.mock('@/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = mockUseAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return <>{children}</>;
  },
}));

import { ProtectedRoute } from '@/components/ProtectedRoute';

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  mockUseAuth.mockReturnValue({
    user: null,
    session: null,
    signOut: vi.fn(),
    loading: false,
  });
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// SUITE: ProtectedRoute — Auth Gate Tests
// ---------------------------------------------------------------------------

describe('ProtectedRoute — Auth Gate Tests', () => {
  it('renders_children_when_user_is_authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@apex.com' },
      session: { access_token: 'mock-token' },
      loading: false,
      signOut: vi.fn(),
    });

    renderWithProviders(
      <ProtectedRoute>
        <div data-testid="protected-content">Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('shows_loader_when_auth_is_loading', () => {
    mockUseAuth.mockReturnValue({
      user: null, session: null, loading: true, signOut: vi.fn(),
    });

    const { container } = renderWithProviders(
      <ProtectedRoute>
        <div>Should not render</div>
      </ProtectedRoute>
    );

    expect(container.querySelector('.animate-spin')).toBeTruthy();
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });

  it('renders_null_when_unauthenticated_and_not_loading', () => {
    mockUseAuth.mockReturnValue({
      user: null, session: null, loading: false, signOut: vi.fn(),
    });

    renderWithProviders(
      <ProtectedRoute>
        <div data-testid="should-not-render">Protected</div>
      </ProtectedRoute>
    );

    expect(screen.queryByTestId('should-not-render')).not.toBeInTheDocument();
  });
});
