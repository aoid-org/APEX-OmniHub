/**
 * MCPDispatcher — Tool invocation, approval gating & audit trail
 * @version 1.0.0
 * @module src/core/mcp/MCPDispatcher
 *
 * Single-responsibility: route tool invocations through validation,
 * approval gating, JSON-RPC execution, and audit trail emission.
 * Extracted from MCPHostManager to prevent god-class accumulation.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { MCPToolDiscovery } from './MCPToolDiscovery';
import type { MCPTransport } from './MCPTransport';
import type {
  ToolInvocation,
  ToolResult,
  ApprovalRequest,
  ApprovalCallback,
  AuditEntry,
  AuditCallback,
  BridgeRiskLevel,
} from './MCPHostManager';
import { ToolInvocationSchema } from './MCPHostManager';
import { deriveTraceMeta } from '../gateway/ProtocolContracts';

// ============================================================================
// Dispatcher
// ============================================================================

export class MCPDispatcher {
  private approvalCallback: ApprovalCallback | null = null;
  private auditCallback: AuditCallback | null = null;

  // --------------------------------------------------------------------------
  // Callback Registration
  // --------------------------------------------------------------------------

  /** Set the approval callback for risky tool invocations. */
  setApprovalCallback(callback: ApprovalCallback): void {
    this.approvalCallback = callback;
  }

  /** Set the audit trail callback for tool invocation logging. */
  setAuditCallback(callback: AuditCallback): void {
    this.auditCallback = callback;
  }

  // --------------------------------------------------------------------------
  // Tool Invocation
  // --------------------------------------------------------------------------

  /**
   * Invoke an MCP tool with approval gating and audit trail.
   *
   * Flow:
   * 1. Validate tool exists in discovery cache
   * 2. Check risk level — gate write/destructive ops through approval
   * 3. Send JSON-RPC request via transport (with retry)
   * 4. Persist audit entry
   * 5. Return structured result
   */
  async invokeTool(
    invocation: ToolInvocation,
    discovery: MCPToolDiscovery,
    getTransport: (serverId: string) => MCPTransport | undefined,
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const parsed = ToolInvocationSchema.parse(invocation);
    const traceMeta = deriveTraceMeta({ correlationId: parsed.correlationId });

    // 1. Look up tool
    const tool = discovery.getTool(parsed.toolName);
    if (!tool) {
      this.emitAudit({
        correlationId: parsed.correlationId,
        requestId: traceMeta.requestId,
        workflowId: traceMeta.workflowId,
        approvalId: traceMeta.approvalId,
        toolName: parsed.toolName,
        serverId: 'unknown',
        riskLevel: 'read',
        approved: false,
        success: false,
        durationMs: Date.now() - startTime,
        error: `Unknown tool: ${parsed.toolName}`,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        data: undefined,
        error: `Unknown tool: ${parsed.toolName}`,
        durationMs: Date.now() - startTime,
        correlationId: parsed.correlationId,
      };
    }

    const riskLevel = resolveEffectiveRiskLevel(parsed.toolName, tool.riskLevel ?? 'read');

    // 2. Approval gate for risky operations
    if (riskLevel !== 'read' || discovery.requiresApproval(parsed.toolName)) {
      const approved = await this.requestApproval({
        toolName: parsed.toolName,
        params: parsed.params,
        riskLevel,
        serverId: tool.serverId,
      });

      if (!approved) {
        this.emitAudit({
          correlationId: parsed.correlationId,
          requestId: traceMeta.requestId,
          workflowId: traceMeta.workflowId,
          approvalId: traceMeta.approvalId,
          toolName: parsed.toolName,
          serverId: tool.serverId,
          riskLevel,
          approved: false,
          success: false,
          durationMs: Date.now() - startTime,
          error: 'User denied tool invocation',
          timestamp: new Date().toISOString(),
        });
        return {
          success: false,
          data: undefined,
          error: 'User denied tool invocation',
          durationMs: Date.now() - startTime,
          correlationId: parsed.correlationId,
        };
      }
    }

    // 3. Send JSON-RPC request (transport handles retry)
    const transport = getTransport(tool.serverId);
    if (transport?.status !== 'connected') {
      this.emitAudit({
        correlationId: parsed.correlationId,
        requestId: traceMeta.requestId,
        workflowId: traceMeta.workflowId,
        approvalId: traceMeta.approvalId,
        toolName: parsed.toolName,
        serverId: tool.serverId,
        riskLevel,
        approved: true,
        success: false,
        durationMs: Date.now() - startTime,
        error: `Server not connected: ${tool.serverId}`,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        data: undefined,
        error: `Server not connected: ${tool.serverId}`,
        durationMs: Date.now() - startTime,
        correlationId: parsed.correlationId,
      };
    }

    try {
      const response = await transport.send({
        jsonrpc: '2.0',
        id: parsed.correlationId,
        method: 'tools/call',
        params: {
          name: parsed.toolName,
          arguments: parsed.params,
        },
      });

      const success = !response.error;
      const result: ToolResult = success
        ? {
            success: true,
            data: response.result,
            durationMs: Date.now() - startTime,
            correlationId: parsed.correlationId,
          }
        : {
            success: false,
            data: undefined,
            error: response.error!.message,
            durationMs: Date.now() - startTime,
            correlationId: parsed.correlationId,
          };

      // 4. Persist audit entry
      this.emitAudit({
        correlationId: parsed.correlationId,
        requestId: traceMeta.requestId,
        workflowId: traceMeta.workflowId,
        approvalId: traceMeta.approvalId,
        toolName: parsed.toolName,
        serverId: tool.serverId,
        riskLevel,
        approved: true,
        success: result.success,
        durationMs: result.durationMs,
        error: result.error,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Tool invocation failed';
      this.emitAudit({
        correlationId: parsed.correlationId,
        requestId: traceMeta.requestId,
        workflowId: traceMeta.workflowId,
        approvalId: traceMeta.approvalId,
        toolName: parsed.toolName,
        serverId: tool.serverId,
        riskLevel,
        approved: true,
        success: false,
        durationMs: Date.now() - startTime,
        error: message,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        data: undefined,
        error: message,
        durationMs: Date.now() - startTime,
        correlationId: parsed.correlationId,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  /** Request user approval for a risky tool invocation. */
  private async requestApproval(request: ApprovalRequest): Promise<boolean> {
    if (!this.approvalCallback) {
      // No callback set — fail-closed: deny by default
      return false;
    }
    return this.approvalCallback(request);
  }

  /**
   * Emit an audit entry to the registered callback.
   * Fire-and-forget: audit failures never block tool execution.
   */
  private emitAudit(entry: AuditEntry): void {
    if (!this.auditCallback) return;
    try {
      this.auditCallback(entry);
    } catch {
      // Audit persistence failures are silent — never block the pipeline
    }
  }
}


function resolveEffectiveRiskLevel(
  toolName: string,
  declaredRiskLevel: BridgeRiskLevel,
): BridgeRiskLevel {
  const normalized = toolName.toLowerCase();
  if (/delete|destroy|drop|purge|revoke/.test(normalized)) {
    return 'destructive';
  }
  if (/create|update|insert|modify|write|approve|execute/.test(normalized)) {
    return declaredRiskLevel === 'destructive' ? 'destructive' : 'write';
  }
  return declaredRiskLevel;
}
