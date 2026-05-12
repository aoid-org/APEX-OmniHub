/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { CloudSetupMessage } from '@/components/CloudSetupMessage';
import {
  markDeviceTrusted,
  syncOnLogin,
  startBackgroundDeviceSync,
  stopBackgroundDeviceSync,
  upsertDevice,
} from '@/zero-trust/deviceRegistry';
import { recordAuditEvent } from '@/security/auditLog';
import { createDebugLogger } from '@/lib/debug-logger';
import { isDemoAuthEnabled } from '../../apps/omnihub-site/src/lib/demo-data';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
  loading: boolean;
  authMode: 'supabase' | 'demo';
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  signOut: async () => { },
  loading: true,
  authMode: 'supabase',
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloudConfigured, setCloudConfigured] = useState(true);
  const [authMode, setAuthMode] = useState<'supabase' | 'demo'>('supabase');
  const navigate = useNavigate();

  useEffect(() => {
    const log = createDebugLogger('AuthContext.tsx', 'B');
    log('AuthProvider useEffect entry');

    // Centralized demo auth resolution
    // Always call this synchronously so ProtectedRoute sees authMode="demo" instantly
    if (isDemoAuthEnabled()) {
      log('Demo mode active, faking auth context');
      setAuthMode('demo');
      const mockUser = {
        id: 'demo-user-123',
        email: 'demo@apexomnihub.icu',
        role: 'authenticated',
      } as User;

      setUser(mockUser);
      setSession({
        user: mockUser,
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
      });
      setLoading(false);
      setCloudConfigured(true);
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const supabaseAnonKey =
        import.meta.env.VITE_SUPABASE_ANON_KEY ??
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      log('Environment variables check', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
      });

      if (!supabaseUrl || !supabaseAnonKey) {
        if (import.meta.env.DEV) {
          console.warn(
            'Missing Supabase environment variables. Checked: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY | VITE_SUPABASE_PUBLISHABLE_KEY'
          );
        }
        setCloudConfigured(false);
        setLoading(false);
        return;
      }

      log('Before onAuthStateChange');

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event: string, session: Session | null) => {
          log('Auth state change', {
            event,
            hasSession: !!session,
            hasUser: !!session?.user,
          });
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      log('Before getSession');

      supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
        log('getSession result', {
          hasSession: !!session,
          hasUser: !!session?.user,
        });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }).catch((error: unknown) => {
        log('getSession error', {
          error: error instanceof Error ? error.message : 'unknown',
        });
        if (import.meta.env.DEV) {
          console.error('Failed to get session:', error);
        }
        setLoading(false);
      });

      return () => {
        const cleanupLog = createDebugLogger('AuthContext.tsx', 'F');
        cleanupLog('AuthProvider cleanup');
        subscription.unsubscribe();
      };
    } catch (error) {
      log('AuthProvider useEffect error', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      if (import.meta.env.DEV) {
        console.error('AuthProvider initialization error:', error);
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const log = createDebugLogger('AuthContext.tsx', 'B');

    log('Device sync useEffect entry', {
      hasSession: !!session,
      hasUser: !!session?.user,
      authMode
    });

    if (!session?.user) {
      stopBackgroundDeviceSync();
      return;
    }

    if (authMode === 'demo') {
      log('Skipping device sync for demo user');
      return;
    }

    try {
      const deviceId = localStorage.getItem('device_id') || crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
      const fingerprint = navigator.userAgent;

      log('Before device sync operations', {
        deviceId,
        userId: session.user.id,
      });

      (async () => {
        try {
          log('Before syncOnLogin');
          await syncOnLogin(session.user.id);

          log('Before upsertDevice');
          await upsertDevice(session.user.id, deviceId, { fingerprint }, 'suspect');

          log('Before markDeviceTrusted');
          await markDeviceTrusted(deviceId);

          log('Before startBackgroundDeviceSync');
          startBackgroundDeviceSync(session.user.id);

          recordAuditEvent({
            actorId: session.user.id,
            actionType: 'login',
            resourceType: 'session',
            resourceId: deviceId,
            metadata: { fingerprint },
          });

          log('Device sync operations complete');
        } catch (error) {
          log('Device sync operations error', {
            error: error instanceof Error ? error.message : 'unknown',
          });
          if (import.meta.env.DEV) {
            console.error('Device sync error:', error);
          }
        }
      })();
    } catch (error) {
      log('Device sync useEffect error', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      if (import.meta.env.DEV) {
        console.error('Device sync setup error:', error);
      }
    }

    return () => {
      const cleanupLog = createDebugLogger('AuthContext.tsx', 'F');
      cleanupLog('Device sync cleanup');
      stopBackgroundDeviceSync();
    };
  }, [session, authMode]);

  const signOut = useCallback(async () => {
    if (authMode === 'demo') {
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem('demo_mode_override');
            window.location.href = '/auth'; // hard redirect to strip query params
        }
        return;
    }

    await supabase.auth.signOut();
    stopBackgroundDeviceSync();
    if (session?.user) {
      recordAuditEvent({
        actorId: session.user.id,
        actionType: 'logout',
        resourceType: 'session',
        resourceId: 'self',
      });
    }
    navigate('/auth');
  }, [authMode, navigate, session?.user]);

  const authValue = useMemo(
    () => ({
      user,
      session,
      signOut,
      loading,
      authMode,
    }),
    [loading, session, signOut, user, authMode],
  );

  // Show setup message if Cloud is not configured
  if (!cloudConfigured && authMode !== 'demo') {
    return <CloudSetupMessage />;
  }

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};
