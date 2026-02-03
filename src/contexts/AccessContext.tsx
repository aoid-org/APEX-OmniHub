/**
 * AccessContext - Demo/live mode state management
 * 
 * Provides:
 * - isDemo: whether app is in demo mode
 * - setDemoMode: toggle demo mode
 * - userScopes: current user's access scopes
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { AccessScope } from '@/features/registry';

interface AccessContextValue {
  readonly isDemo: boolean;
  readonly setDemoMode: (demo: boolean) => void;
  readonly userScopes: readonly AccessScope[];
  readonly isAuthenticated: boolean;
  readonly isAdmin: boolean;
}

const AccessContext = createContext<AccessContextValue | null>(null);

const DEMO_MODE_KEY = 'apex-demo-mode';

interface AccessProviderProps {
  readonly children: ReactNode;
  readonly initialScopes?: readonly AccessScope[];
}

export function AccessProvider({ children, initialScopes = ['public'] }: AccessProviderProps) {
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    if (typeof globalThis.window === 'undefined') return false;
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
  });

  const [userScopes, setUserScopes] = useState<readonly AccessScope[]>(initialScopes);

  // Persist demo mode preference
  useEffect(() => {
    localStorage.setItem(DEMO_MODE_KEY, String(isDemo));
  }, [isDemo]);

  // Update scopes when demo mode changes
  useEffect(() => {
    if (isDemo) {
      setUserScopes(['public', 'authenticated', 'demo']);
    } else {
      setUserScopes(initialScopes);
    }
  }, [isDemo, initialScopes]);

  const setDemoMode = useCallback((demo: boolean) => {
    setIsDemo(demo);
  }, []);

  const isAuthenticated = userScopes.includes('authenticated') || userScopes.includes('demo');
  const isAdmin = userScopes.includes('admin');

  const value = useMemo<AccessContextValue>(() => ({
    isDemo,
    setDemoMode,
    userScopes,
    isAuthenticated,
    isAdmin,
  }), [isDemo, setDemoMode, userScopes, isAuthenticated, isAdmin]);

  return (
    <AccessContext.Provider value={value}>
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess(): AccessContextValue {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within AccessProvider');
  }
  return context;
}

/**
 * Hook to check if current user can access a specific scope
 */
export function useCanAccess(requiredScopes: readonly AccessScope[]): boolean {
  const { userScopes } = useAccess();
  return requiredScopes.every(
    (scope) => userScopes.includes(scope) || scope === 'public'
  );
}
