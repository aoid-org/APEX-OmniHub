import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface GatewayMetrics {
  circuitBreakerStatus: 'CLOSED' | 'HALF-OPEN' | 'OPEN';
  errorRate: number;
  activeConnections: number;
  latencyHeatmap: {
    timestamp: number;
    latencyMs: number;
    endpoint: string;
    status: number;
  }[];
}

const INITIAL_METRICS: GatewayMetrics = {
  circuitBreakerStatus: 'CLOSED',
  errorRate: 0.0,
  activeConnections: 0,
  latencyHeatmap: [],
};

/**
 * Hook to consume real-time gateway metrics over Supabase WebSockets.
 * Listens for 'metrics_update' broadcasts from the OmniHub backend.
 */
export function useGatewayMetrics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<GatewayMetrics>(INITIAL_METRICS);

  useEffect(() => {
    if (!user?.id) return;

    // Connect to the shared Gateway Telemetry channel
    const channel = supabase.channel('gateway-telemetry', {
      config: { broadcast: { self: true } },
    });

    channel
      .on(
        'broadcast',
        { event: 'metrics_update' },
        (payload: { payload: Partial<GatewayMetrics> }) => {
          setMetrics((prev) => {
            const newHeatmap = payload.payload.latencyHeatmap
              ? [...prev.latencyHeatmap, ...payload.payload.latencyHeatmap].slice(-50) // Keep last 50
              : prev.latencyHeatmap;

            return {
              ...prev,
              ...payload.payload,
              latencyHeatmap: newHeatmap,
            };
          });
        }
      )
      .subscribe();

    // Mock telemetry for development if backend isn't broadcasting yet
    const demoTimer = setInterval(() => {
      if (process.env.NODE_ENV === 'development') {
        const mockLatency = Math.floor(Math.random() * 200) + 20;
        const mockError = Math.random() > 0.95;
        channel.send({
          type: 'broadcast',
          event: 'metrics_update',
          payload: {
            activeConnections: Math.floor(Math.random() * 100) + 10,
            errorRate: mockError ? 0.6 : 0.05,
            circuitBreakerStatus: mockError ? 'OPEN' : 'CLOSED',
            latencyHeatmap: [
              {
                timestamp: Date.now(),
                latencyMs: mockLatency + (mockError ? 500 : 0),
                endpoint: '/api/v1/graphql',
                status: mockError ? 502 : 200,
              },
            ],
          },
        });
      }
    }, 2000);

    return () => {
      clearInterval(demoTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return metrics;
}
