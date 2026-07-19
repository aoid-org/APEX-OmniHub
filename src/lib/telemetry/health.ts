/**
 * APEX-OmniHub - Subsystem Health Reporter
 */

export type SubsystemStatus = 'configured_not_started' | 'demo' | 'live' | 'unavailable';

export interface SystemHealthReport {
  timestamp: string;
  subsystems: Record<string, SubsystemStatus>;
  overall: 'healthy' | 'degraded' | 'down';
}

export function getSystemHealth(): SystemHealthReport {
  // Hardcoded for proof rail, in reality would poll or read from actual subsystem state
  const subsystems: Record<string, SubsystemStatus> = {
    'SupabaseDB': 'live',
    'SupabaseAPI': 'live',
    'EdgeRequest': 'live',
    'OmniLink': 'demo',
    'OmniBridge': 'demo',
    'OmniConnect': 'demo',
    'BYOM': 'configured_not_started',
    'Web3': 'unavailable',
    'PhysiOmni': 'unavailable',
    'SyncImport': 'demo',
  };

  // ⚡ Bolt: Avoid allocating a new array with Object.values().
  // Instead, use a faster for-in loop to check for unavailable subsystems.
  let overall: SystemHealthReport['overall'] = 'healthy';
  for (const key in subsystems) {
    if (subsystems[key] === 'unavailable') {
      overall = 'degraded';
      break;
    }
  }

  return {
    timestamp: new Date().toISOString(),
    subsystems,
    overall,
  };
}
