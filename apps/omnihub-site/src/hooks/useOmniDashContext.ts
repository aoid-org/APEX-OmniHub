import { useContext } from 'react';
import { OmniDashContext, type OmniDashContextValue } from '../providers/OmniDashContext';

export function useOmniDashContext(): OmniDashContextValue {
  const ctx = useContext(OmniDashContext);
  if (!ctx) {
    throw new Error('[OmniDash] useOmniDashContext must be used within <OmniDashProvider>');
  }
  return ctx;
}
