/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface DemoModeState {
  demoMode: boolean;
  autoPilot: boolean;
  guardianMode: boolean;
  setDemoMode: (v: boolean) => void;
  setAutoPilot: (v: boolean) => void;
  setGuardianMode: (v: boolean) => void;
}

// Production builds must never default to — or surface — demo-mode state.
// import.meta.env.PROD is true in the deployed (Cloudflare Pages) build and
// false under dev/vitest, so dev + tests keep full demo-toggle behaviour.
const IS_PRODUCTION_BUILD = import.meta.env.PROD === true;
const defaults = { demoMode: false, autoPilot: false, guardianMode: true };

const DemoModeContext = createContext<DemoModeState | undefined>(undefined);

// Define a fallback orgId if auth context isn't directly available here
const STORAGE_KEY = `apex_ops_controls_default`;

function getSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Hard production guard: a stale localStorage value can never
      // re-enable demo mode in a production build.
      return IS_PRODUCTION_BUILD ? { ...parsed, demoMode: false } : parsed;
    }
  } catch (err) {
    console.error('Failed to parse DemoModeState from localStorage', err);
  }
  return defaults;
}

export function DemoModeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState(() => getSavedState());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        demoMode: state.demoMode,
        autoPilot: state.autoPilot,
        guardianMode: state.guardianMode,
      }));
    } catch (err) {
      console.error('Failed to save DemoModeState to localStorage', err);
    }
  }, [state.demoMode, state.autoPilot, state.guardianMode]);

  // In production demo mode is locked off; the toggle is hidden there anyway.
  const setDemoMode = useCallback((v: boolean) => setState((s: typeof defaults) => ({ ...s, demoMode: IS_PRODUCTION_BUILD ? false : v })), []);
  const setAutoPilot = useCallback((v: boolean) => setState((s: typeof defaults) => ({ ...s, autoPilot: v })), []);
  const setGuardianMode = useCallback((v: boolean) => setState((s: typeof defaults) => ({ ...s, guardianMode: v })), []);

  const contextValue = useMemo(() => ({
    demoMode: state.demoMode,
    autoPilot: state.autoPilot,
    guardianMode: state.guardianMode,
    setDemoMode,
    setAutoPilot,
    setGuardianMode,
  }), [state.demoMode, state.autoPilot, state.guardianMode, setDemoMode, setAutoPilot, setGuardianMode]);

  return (
    <DemoModeContext.Provider value={contextValue}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}
