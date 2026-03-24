/**
 * useMCPApprovalBridge — Wires MCPHostManager approval to OmniModal
 * @version 1.0.0
 * @module apps/omnihub-site/src/hooks/useMCPApprovalBridge
 *
 * Connects the MCP framework's approval gating callback to the
 * OmniModal UI system. Called once during OmniDashProvider mount
 * to enable interactive approval for write/destructive MCP operations.
 *
 * Without this bridge, MCPHostManager.requestApproval() falls through
 * to fail-closed (deny) because no callback is registered.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useEffect } from 'react';
import { MCPHostManager, type ApprovalRequest } from '../../../../src/core/mcp/MCPHostManager';
import { useOmniModal } from '@/stores/omniModalStore';

/**
 * Wire MCP approval callback to OmniModal on mount.
 * Must be called inside a React component tree (uses hooks).
 */
export function useMCPApprovalBridge(): void {
  const invoke = useOmniModal(s => s.invoke);

  useEffect(() => {
    const host = MCPHostManager.getInstance();

    host.setApprovalCallback(async (request: ApprovalRequest): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        invoke({
          id: `mcp-approve-${Date.now()}`,
          provider: 'mcp',
          type: 'mcp_tool_approve',
          title: `Approve: ${request.toolName}`,
          description: `MCP tool "${request.toolName}" requires ${request.riskLevel}-level access on server "${request.serverId}"`,
          priority: request.riskLevel === 'destructive' ? 'critical' : 'high',
          contextData: {
            toolName: request.toolName,
            params: request.params,
            riskLevel: request.riskLevel,
            serverId: request.serverId,
          },
          onComplete: async (data: Record<string, unknown>) => {
            resolve(data.approved === true);
          },
          onCancel: () => {
            resolve(false);
          },
        });
      });
    });

    return () => {
      // On unmount, clear the callback so it falls back to fail-closed
      host.setApprovalCallback(async () => false);
    };
  }, [invoke]);
}
