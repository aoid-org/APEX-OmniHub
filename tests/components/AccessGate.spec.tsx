/**
 * AccessGate, RequireAuth, RequireAdmin — Unit Tests
 * Tests fail-closed access control rendering logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Mock AccessContext ───────────────────────────────────────────────────

const mockUseAccess = vi.fn();

vi.mock('@/contexts/AccessContext', () => ({
  useAccess: () => mockUseAccess(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────

import { AccessGate, RequireAuth, RequireAdmin } from '@/components/access/AccessGate';

// ─── Helpers ──────────────────────────────────────────────────────────────

function withScopes(userScopes: string[], isDemo = false) {
  mockUseAccess.mockReturnValue({ userScopes, isDemo });
}

// ─── AccessGate ───────────────────────────────────────────────────────────

describe('AccessGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when all required scopes are present', () => {
    withScopes(['authenticated', 'admin']);
    render(
      <AccessGate requiredScopes={['authenticated', 'admin']}>
        <div>Secret Content</div>
      </AccessGate>
    );
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('renders fallback when user lacks required scope', () => {
    withScopes(['authenticated']);
    render(
      <AccessGate requiredScopes={['admin']} fallback={<div>Access Denied</div>}>
        <div>Admin Panel</div>
      </AccessGate>
    );
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('renders nothing (null) by default when access denied and no fallback', () => {
    withScopes([]);
    const { container } = render(
      <AccessGate requiredScopes={['authenticated']}>
        <div>Protected</div>
      </AccessGate>
    );
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('allows public scope for everyone', () => {
    withScopes([]); // no scopes
    render(
      <AccessGate requiredScopes={['public']}>
        <div>Public Content</div>
      </AccessGate>
    );
    expect(screen.getByText('Public Content')).toBeInTheDocument();
  });

  it('grants demo scope in demo mode', () => {
    withScopes([], true); // isDemo = true
    render(
      <AccessGate requiredScopes={['demo']}>
        <div>Demo Content</div>
      </AccessGate>
    );
    expect(screen.getByText('Demo Content')).toBeInTheDocument();
  });

  it('denies demo scope when not in demo mode', () => {
    withScopes([], false); // isDemo = false
    render(
      <AccessGate requiredScopes={['demo']}>
        <div>Demo Content</div>
      </AccessGate>
    );
    expect(screen.queryByText('Demo Content')).not.toBeInTheDocument();
  });

  it('is fail-closed: denies if any required scope is missing', () => {
    withScopes(['authenticated']); // has one but not the other
    render(
      <AccessGate requiredScopes={['authenticated', 'admin']}>
        <div>Billing Panel</div>
      </AccessGate>
    );
    expect(screen.queryByText('Billing Panel')).not.toBeInTheDocument();
  });

  it('grants access when requiredScopes is empty (unrestricted)', () => {
    withScopes([]);
    render(
      <AccessGate requiredScopes={[]}>
        <div>Unrestricted</div>
      </AccessGate>
    );
    expect(screen.getByText('Unrestricted')).toBeInTheDocument();
  });
});

// ─── RequireAuth ──────────────────────────────────────────────────────────

describe('RequireAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders children when user is authenticated', () => {
    withScopes(['authenticated']);
    render(
      <RequireAuth>
        <div>Authenticated Content</div>
      </RequireAuth>
    );
    expect(screen.getByText('Authenticated Content')).toBeInTheDocument();
  });

  it('renders fallback when user is not authenticated', () => {
    withScopes([]);
    render(
      <RequireAuth fallback={<div>Please Sign In</div>}>
        <div>Authenticated Content</div>
      </RequireAuth>
    );
    expect(screen.queryByText('Authenticated Content')).not.toBeInTheDocument();
    expect(screen.getByText('Please Sign In')).toBeInTheDocument();
  });
});

// ─── RequireAdmin ─────────────────────────────────────────────────────────

describe('RequireAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders children when user has admin scope', () => {
    withScopes(['admin']);
    render(
      <RequireAdmin>
        <div>Admin Panel</div>
      </RequireAdmin>
    );
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('hides children when user only has authenticated (not admin)', () => {
    withScopes(['authenticated']);
    render(
      <RequireAdmin fallback={<div>Not Admin</div>}>
        <div>Admin Panel</div>
      </RequireAdmin>
    );
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    expect(screen.getByText('Not Admin')).toBeInTheDocument();
  });

  it('hides children when user has no scopes', () => {
    withScopes([]);
    const { container } = render(
      <RequireAdmin>
        <div>Admin Panel</div>
      </RequireAdmin>
    );
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });
});
