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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  signOut: async () => { },
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloudConfigured, setCloudConfigured] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const log = createDebugLogger('AuthContext.tsx', 'B');

    // #region agent log
    log('AuthProvider useEffect entry');
    // #endregion

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const supabaseAnonKey =
        import.meta.env.VITE_SUPABASE_ANON_KEY ??
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // #region agent log
      log('Environment variables check', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
      });
      // #endregion

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

      // #region agent log
      log('Before onAuthStateChange');
      // #endregion

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event: string, session: Session | null) => {
          // #region agent log
          log('Auth state change', {
            event,
            hasSession: !!session,
            hasUser: !!session?.user,
          });
          // #endregion
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      // #region agent log
      log('Before getSession');
      // #endregion

      supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
        // #region agent log
        log('getSession result', {
          hasSession: !!session,
          hasUser: !!session?.user,
        });
        // #endregion
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }).catch((error: unknown) => {
        // #region agent log
        log('getSession error', {
          error: error instanceof Error ? error.message : 'unknown',
        });
        // #endregion
        if (import.meta.env.DEV) {
          console.error('Failed to get session:', error);
        }
        setLoading(false);
      });

      return () => {
        const cleanupLog = createDebugLogger('AuthContext.tsx', 'F');
        // #region agent log
        cleanupLog('AuthProvider cleanup');
        // #endregion
        subscription.unsubscribe();
      };
    } catch (error) {
      // #region agent log
      log('AuthProvider useEffect error', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      // #endregion
      if (import.meta.env.DEV) {
        console.error('AuthProvider initialization error:', error);
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const log = createDebugLogger('AuthContext.tsx', 'B');

    // #region agent log
    log('Device sync useEffect entry', {
      hasSession: !!session,
      hasUser: !!session?.user,
    });
    // #endregion

    if (!session?.user) {
      stopBackgroundDeviceSync();
      return;
    }

    try {
      const deviceId = localStorage.getItem('device_id') || crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
      const fingerprint = navigator.userAgent;

      // #region agent log
      log('Before device sync operations', {
        deviceId,
        userId: session.user.id,
      });
      // #endregion

      (async () => {
        try {
          // #region agent log
          log('Before syncOnLogin');
          // #endregion
          await syncOnLogin(session.user.id);

          // #region agent log
          log('Before upsertDevice');
          // #endregion
          await upsertDevice(session.user.id, deviceId, { fingerprint }, 'suspect');

          // #region agent log
          log('Before markDeviceTrusted');
          // #endregion
          await markDeviceTrusted(deviceId);

          // #region agent log
          log('Before startBackgroundDeviceSync');
          // #endregion
          startBackgroundDeviceSync(session.user.id);

          recordAuditEvent({
            actorId: session.user.id,
            actionType: 'login',
            resourceType: 'session',
            resourceId: deviceId,
            metadata: { fingerprint },
          });

          // #region agent log
          log('Device sync operations complete');
          // #endregion
        } catch (error) {
          // #region agent log
          log('Device sync operations error', {
            error: error instanceof Error ? error.message : 'unknown',
          });
          // #endregion
          if (import.meta.env.DEV) {
            console.error('Device sync error:', error);
          }
        }
      })();
    } catch (error) {
      // #region agent log
      log('Device sync useEffect error', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      // #endregion
      if (import.meta.env.DEV) {
        console.error('Device sync setup error:', error);
      }
    }

    return () => {
      const cleanupLog = createDebugLogger('AuthContext.tsx', 'F');
      // #region agent log
      cleanupLog('Device sync cleanup');
      // #endregion
      stopBackgroundDeviceSync();
    };
  }, [session]);

  const signOut = useCallback(async () => {
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
  }, [navigate, session?.user]);

  const authValue = useMemo(
    () => ({
      user,
      session,
      signOut,
      loading,
    }),
    [loading, session, signOut, user],
  );

  // MFA Challenge State
  const [mfaChallengeActive, setMfaChallengeActive] = useState(false);

  useEffect(() => {
    if (session?.user && !loading) {
      // Check if device requires MFA (e.g., untrusted device)
      const deviceId = localStorage.getItem('device_id');
      if (deviceId) {
        import('@/zero-trust/deviceRegistry').then(({ isDeviceAuthorized }) => {
          const authResult = isDeviceAuthorized(deviceId);
          if (!authResult.authorized && authResult.reason !== 'device_blocked') {
            setMfaChallengeActive(true);
          }
        });
      }
    }
  }, [session, loading]);

  // Show setup message if Cloud is not configured
  if (!cloudConfigured) {
    return <CloudSetupMessage />;
  }

  if (mfaChallengeActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Security Challenge</h2>
          <p className="text-gray-400">
            This device is not fully trusted. Secondary authentication (MFA) is required to proceed.
          </p>
          <div className="pt-4 flex flex-col space-y-3">
            <button 
              onClick={() => setMfaChallengeActive(false)} 
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              Verify Identity
            </button>
            <button 
              onClick={signOut} 
              className="w-full py-3 bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300 font-medium rounded-lg transition-colors"
            >
              Cancel & Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};
