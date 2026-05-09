import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/integrations/supabase/client';
import * as deviceRegistry from '../../src/zero-trust/deviceRegistry';
import * as auditLog from '../../src/security/auditLog';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('../../src/zero-trust/deviceRegistry', () => ({
  markDeviceTrusted: vi.fn(),
  syncOnLogin: vi.fn(),
  startBackgroundDeviceSync: vi.fn(),
  stopBackgroundDeviceSync: vi.fn(),
  upsertDevice: vi.fn(),
  isDeviceAuthorized: vi.fn(),
}));

vi.mock('../../src/security/auditLog', () => ({
  recordAuditEvent: vi.fn(),
}));

vi.mock('../../src/lib/debug-logger', () => ({
  createDebugLogger: () => vi.fn(),
}));

vi.mock('../../src/components/CloudSetupMessage', () => ({
  CloudSetupMessage: () => <div data-testid="cloud-setup">Cloud Setup Required</div>,
}));

// Setup import.meta.env
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

const TestComponent = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="user-id">{auth.user?.id || 'no-user'}</div>
      <div data-testid="loading">{auth.loading ? 'loading' : 'ready'}</div>
      <button onClick={() => auth.signOut()}>Sign Out</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (supabase.auth.onAuthStateChange as Mock).mockImplementation(
      (_cb: unknown) => {
      return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );

    (supabase.auth.getSession as Mock).mockResolvedValue({
      data: { session: null },
    });
  });

  it('renders cloud setup message when env vars are missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('cloud-setup')).toBeInTheDocument();
    
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  });

  it('renders children and handles initial session state', async () => {
    (supabase.auth.getSession as Mock).mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-id')).toHaveTextContent('user-123');
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });
  });

  it('handles device sync when user is authenticated', async () => {
    const user = { id: 'user-456' };
    (supabase.auth.getSession as Mock).mockResolvedValue({
      data: { session: { user } },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(deviceRegistry.syncOnLogin).toHaveBeenCalledWith('user-456');
      expect(deviceRegistry.upsertDevice).toHaveBeenCalled();
      expect(deviceRegistry.markDeviceTrusted).toHaveBeenCalled();
      expect(deviceRegistry.startBackgroundDeviceSync).toHaveBeenCalledWith('user-456');
      expect(auditLog.recordAuditEvent).toHaveBeenCalled();
    });
  });

  it('handles sign out correctly', async () => {
    const user = { id: 'user-789' };
    (supabase.auth.getSession as Mock).mockResolvedValue({
      data: { session: { user } },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-id')).toHaveTextContent('user-789');
    });

    fireEvent.click(screen.getByText('Sign Out'));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(deviceRegistry.stopBackgroundDeviceSync).toHaveBeenCalled();
      expect(auditLog.recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'logout',
        actorId: 'user-789'
      }));
    });
  });

  it('displays MFA challenge when device is not trusted', async () => {
    const user = { id: 'user-mfa' };
    (supabase.auth.getSession as Mock).mockResolvedValue({
      data: { session: { user } },
    });
    
    // Force localStorage to have a device_id so MFA check runs
    localStorage.setItem('device_id', 'test-device');
    
    (deviceRegistry.isDeviceAuthorized as Mock).mockReturnValue({
      authorized: false,
      reason: 'untrusted',
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Security Challenge/i)).toBeInTheDocument();
      expect(screen.getByText(/Verify Identity/i)).toBeInTheDocument();
    });
  });
});
