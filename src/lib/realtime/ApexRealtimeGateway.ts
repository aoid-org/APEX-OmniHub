interface ConnectParams {
  skillId: string;
}

interface ConnectResult {
  ok: boolean;
}

export const ApexRealtimeGateway = {
  async connect(params: ConnectParams): Promise<ConnectResult & { ws?: WebSocket; error?: string }> {
    return new Promise((resolve) => {
      const baseUrl = (import.meta.env.VITE_ORCHESTRATOR_URL as string | undefined) || 'localhost:3000';
      const wssUrl = `wss://${baseUrl.replace(/^https?:\/\//, '')}/realtime/${params.skillId}`;

      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ ok: false, error: 'Connection timeout' });
        }
      }, 5000);

      try {
        const ws = new WebSocket(wssUrl);

        ws.onopen = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            // Emit connection params as JSON in first message
            ws.send(JSON.stringify({ type: 'init', params }));
            resolve({ ok: true, ws });
          }
        };

        ws.onerror = (error) => {
          console.error('[ApexRealtimeGateway] WebSocket error:', error);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            resolve({ ok: false, error: 'WebSocket connection error' });
          }
        };

        ws.onclose = () => {
          // eslint-disable-next-line no-console
          console.info('[ApexRealtimeGateway] WebSocket closed');
        };

        ws.onmessage = (event) => {
          // eslint-disable-next-line no-console
          console.info('[ApexRealtimeGateway] Message received:', event.data);
        };
      } catch (e) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' });
        }
      }
    });
  },
};

export type { ConnectParams, ConnectResult };
