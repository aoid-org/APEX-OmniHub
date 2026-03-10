import { createContext } from 'react';
import type { ZIndexManager } from '../lib/ZIndexManager';

export interface OmniDashContextValue {
  readonly widgetCount: number;
  readonly hasFloatingWindows: boolean;
  readonly zManager: ZIndexManager;
}

export const OmniDashContext = createContext<OmniDashContextValue | null>(null);
