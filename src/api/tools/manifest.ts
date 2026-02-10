/**
 * Universal Tool Manifest — filtered per-device tool list.
 *
 * Serves OpenAI function-tool JSON Schema filtered by Aegis
 * permissions. Lower trust tiers cannot see or invoke
 * high-risk tools.
 *
 * @module api/tools/manifest
 * @version 1.0.0
 * @date 2026-02-09
 */

import { validateAccess } from '../../core/security/AegisKernel';
import {
  authenticate,
  SpectreAuthError,
} from '../../core/security/SpectreHandshake';
import type {
  DeviceProfile,
  ToolFunctionSchema,
  ToolManifestResponse,
} from '../../core/types/index';

/* ------------------------------------------------------------------ */
/*  APEX Tool Manifest (source of truth)                               */
/* ------------------------------------------------------------------ */

export const APEX_TOOL_MANIFEST: ReadonlyArray<ToolFunctionSchema> =
  [
    {
      type: 'function',
      function: {
        name: 'search_database',
        description: 'Search database records by filters',
        parameters: {
          type: 'object',
          properties: {
            table: { type: 'string' },
            filters: { type: 'object' },
            select: { type: 'string' },
          },
          required: ['table'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_record',
        description: 'Create a new record in the database',
        parameters: {
          type: 'object',
          properties: {
            table: { type: 'string' },
            data: { type: 'object' },
          },
          required: ['table', 'data'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'delete_record',
        description: 'Delete a record from the database',
        parameters: {
          type: 'object',
          properties: {
            table: { type: 'string' },
            id: { type: 'string' },
          },
          required: ['table', 'id'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'send_email',
        description: 'Send an email notification',
        parameters: {
          type: 'object',
          properties: {
            to: { type: 'string' },
            subject: { type: 'string' },
            body: { type: 'string' },
          },
          required: ['to', 'subject', 'body'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'call_webhook',
        description: 'Invoke an external webhook',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            method: { type: 'string' },
            payload: { type: 'object' },
          },
          required: ['url'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_youtube',
        description: 'Search YouTube for videos',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'update_context',
        description: 'Update session context with key-value data',
        parameters: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            value: { type: 'string' },
          },
          required: ['key', 'value'],
          additionalProperties: false,
        },
      },
    },
  ];

/* ------------------------------------------------------------------ */
/*  Filtering                                                          */
/* ------------------------------------------------------------------ */

/**
 * Filter the manifest to only include tools this device may access.
 */
export function filterManifest(
  device: DeviceProfile,
): ToolManifestResponse {
  const tools = APEX_TOOL_MANIFEST.filter((tool) =>
    validateAccess(tool.function.name, device),
  );

  return {
    tools,
    meta: {
      device_id: device.deviceId,
      trust_tier: device.trustTier,
      count: tools.length,
      generated_at: new Date().toISOString(),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Request handler (framework-agnostic)                               */
/* ------------------------------------------------------------------ */

type HeaderSource =
  | { get(name: string): string | null | undefined }
  | Record<string, string | undefined>;

export interface ManifestHandlerResult {
  readonly status: number;
  readonly body: ToolManifestResponse | { error: string };
}

/**
 * Handle a tool manifest request.
 *
 * @param headers - request headers (Map-like or plain object)
 * @param connectionId - unique connection id
 */
export function handleManifestRequest(
  headers: HeaderSource,
  connectionId: string,
): ManifestHandlerResult {
  try {
    const device = authenticate(headers, connectionId);
    const manifest = filterManifest(device);
    return { status: 200, body: manifest };
  } catch (err: unknown) {
    if (err instanceof SpectreAuthError) {
      return {
        status: err.statusCode,
        body: { error: err.message },
      };
    }
    return {
      status: 500,
      body: { error: 'Internal server error' },
    };
  }
}
