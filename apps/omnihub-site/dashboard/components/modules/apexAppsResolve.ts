/**
 * apexAppsResolve — Deterministic prompt → APEX app resolution.
 *
 * Separated from ApexAppsMcpModule.tsx to satisfy react-refresh/only-export-components
 * (the module file may export only its component). Pure + unit-testable.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */
import { LIVE_APEX_APPS } from '../../contracts/apexApps';

export type ApexApp = (typeof LIVE_APEX_APPS)[number];

/** Resolve a free-text prompt to a known APEX ecosystem app. */
export function resolveApexApp(prompt: string): ApexApp | null {
  const q = prompt.trim().toLowerCase();
  if (!q) return null;
  // 1. Exact id or label match.
  const exact = LIVE_APEX_APPS.find(
    (a) => a.id === q || a.label.toLowerCase() === q,
  );
  if (exact) return exact;
  // 2. Substring match either direction (handles "connect my dueradar account").
  return (
    LIVE_APEX_APPS.find(
      (a) =>
        q.includes(a.id) ||
        q.includes(a.label.toLowerCase()) ||
        a.label.toLowerCase().includes(q) ||
        a.id.includes(q),
    ) ?? null
  );
}
