interface ConnectParams {
  skillId: string;
}

interface ConnectResult {
  ok: boolean;
}

export const ApexRealtimeGateway = {
  async connect(params: ConnectParams): Promise<ConnectResult> {
    console.warn('[ApexRealtimeGateway] Connect stub called with:', params.skillId);
    return { ok: true };
  },
};

export type { ConnectParams, ConnectResult };
