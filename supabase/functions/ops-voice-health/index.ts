interface VoiceMetrics {
  handshakeAvg: number;
  latencyP99: number;
  activeSessions: number;
  safetyViolations: number;
}

interface VoiceLog {
  type: string;
  msg: string;
  timestamp: string;
}

interface VoiceHealthResponse {
  metrics: VoiceMetrics;
  logs: VoiceLog[];
}

import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from "../_shared/rate-limit.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  // Distributed rate limiting — unauthenticated health endpoint, keyed by client IP
  const rl = await checkRateLimit(
    req.headers.get('x-forwarded-for') ?? 'anon',
    RATE_LIMIT_CONFIGS.opsVoiceHealth,
  );
  if (!rl.allowed) {
    return rateLimitExceededResponse(origin, rl);
  }

  const data: VoiceHealthResponse = {
    metrics: {
      handshakeAvg: 212,
      latencyP99: 780,
      activeSessions: 3,
      safetyViolations: 0
    },
    logs: [
      {
        type: 'info',
        msg: 'System initialized',
        timestamp: new Date().toISOString()
      },
      {
        type: 'metric',
        msg: 'Handshake: 212ms',
        timestamp: new Date().toISOString()
      }
    ]
  };

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
