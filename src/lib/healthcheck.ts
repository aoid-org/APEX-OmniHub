import { supabase } from '@/integrations/supabase/client';
import { logError } from './monitoring';
import { getLoopStatuses, GuardianLoopStatus } from '@/guardian/heartbeat';

export interface HealthCheckResult {
  status: 'OK' | 'error';
  timestamp?: string;
  tests?: {
    read: string;
    write: string;
    auth: string;
  };
  guardian?: GuardianLoopStatus[];
  error?: string;
  healthCheckId?: string;
}

/**
 * Run a comprehensive health check of the Supabase connection
 * Tests: authentication, read access, and write access
 */
export async function runHealthCheck(): Promise<HealthCheckResult> {
  try {
    // Call the edge function to run server-side health checks
    const { data, error } = await supabase.functions.invoke('supabase_healthcheck');
    const guardianStatus = getLoopStatuses();

    if (error) {
      logError(error, { action: 'health_check_failed' });
      return {
        status: 'error',
        error: error.message,
        guardian: guardianStatus,
      };
    }

    return {
      ...(data as HealthCheckResult),
      guardian: guardianStatus,
    };
  } catch (error) {
    logError(error as Error, { action: 'health_check_exception' });
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      guardian: getLoopStatuses(), // Return best-effort status even on error
    };
  }
}
