/**
 * AccessContext - Demo vs Live Mode Provider
 * 
 * Manages access mode state and provides context for AccessGate decisions.
 * Demo mode uses localStorage key "apex.demo.enabled".
 * 
 * @example
 * const { isDemo, isAuthenticated, enableDemo, disableDemo } = useAccessMode();
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

interface AccessContextValue {
  /** Whether demo mode is enabled */
  isDemo: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** User object (if authenticated) */
  user: { id: string; email?: string } | null;
  /** Enable demo mode */
  enableDemo: () => void;
  /** Disable demo mode and return to gate */
  disableDemo: () => void;
  /** Current access mode label */
  modeLabel: 'demo' | 'live' | 'guest';
}

const AccessContext = createContext<AccessContextValue | undefined>(undefined);

// ============================================================================
// CONSTANTS
// ============================================================================

const DEMO_STORAGE_KEY = 'apex.demo.enabled';

// ============================================================================
// PROVIDER
// ============================================================================

interface AccessProviderProps {
  readonly children: ReactNode;
}

export const AccessProvider: React.FC<AccessProviderProps> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    // Check localStorage on initial load
    if (typeof globalThis.localStorage !== 'undefined') {
      return globalThis.localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
    }
    return false;
  });

  // Sync demo state to localStorage
  useEffect(() => {
    if (typeof globalThis.localStorage !== 'undefined') {
      if (isDemo) {
        globalThis.localStorage.setItem(DEMO_STORAGE_KEY, 'true');
      } else {
        globalThis.localStorage.removeItem(DEMO_STORAGE_KEY);
      }
    }
  }, [isDemo]);

  // If user authenticates while in demo mode, exit demo mode
  useEffect(() => {
    if (user && isDemo) {
      setIsDemo(false);
    }
  }, [user, isDemo]);

  const enableDemo = useCallback(() => {
    setIsDemo(true);
  }, []);

  const disableDemo = useCallback(() => {
    setIsDemo(false);
  }, []);

  const isAuthenticated = Boolean(user) && !authLoading;

  const modeLabel = useMemo((): 'demo' | 'live' | 'guest' => {
    if (isAuthenticated) return 'live';
    if (isDemo) return 'demo';
    return 'guest';
  }, [isAuthenticated, isDemo]);

  const value = useMemo<AccessContextValue>(
    () => ({
      isDemo,
      isAuthenticated,
      user: user ? { id: user.id, email: user.email ?? undefined } : null,
      enableDemo,
      disableDemo,
      modeLabel,
    }),
    [isDemo, isAuthenticated, user, enableDemo, disableDemo, modeLabel]
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
};

// ============================================================================
// HOOK
// ============================================================================

export const useAccessMode = (): AccessContextValue => {
  const context = useContext(AccessContext);
  if (context === undefined) {
    throw new Error('useAccessMode must be used within an AccessProvider');
  }
  return context;
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if demo mode is enabled (static check, no hook)
 * Use sparingly - prefer useAccessMode() hook
 */
export function isDemoModeEnabled(): boolean {
  if (typeof globalThis.localStorage !== 'undefined') {
    return globalThis.localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
  }
  return false;
}

/**
 * Force enable demo mode (for programmatic control)
 */
export function forceEnableDemo(): void {
  if (typeof globalThis.localStorage !== 'undefined') {
    globalThis.localStorage.setItem(DEMO_STORAGE_KEY, 'true');
  }
}

/**
 * Force disable demo mode (for programmatic control)
 */
export function forceDisableDemo(): void {
  if (typeof globalThis.localStorage !== 'undefined') {
    globalThis.localStorage.removeItem(DEMO_STORAGE_KEY);
  }
}

export default AccessProvider;
