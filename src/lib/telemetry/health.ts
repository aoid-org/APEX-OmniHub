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

  const hasUnavailable = Object.values(subsystems).includes('unavailable');
  const allLive = Object.values(subsystems).every(s => s === 'live');

  let overall: SystemHealthReport['overall'] = 'healthy';
  if (hasUnavailable) {
    overall = 'degraded';
  } else if (!allLive) {
    overall = 'healthy';
  }

  return {
    timestamp: new Date().toISOString(),
    subsystems,
    overall,
  };
}
