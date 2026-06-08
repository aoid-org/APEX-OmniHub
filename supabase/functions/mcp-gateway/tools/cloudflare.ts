/**
 * Cloudflare Deployment Tools (5 tools)
 * Uses CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID env vars.
 */

import type { MCPTool, ToolCallResult } from "./registry.ts";
import { ok, err } from "./registry.ts";

const CF_API = "https://api.cloudflare.com/client/v4";

async function cfFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN");
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN is not configured.");

  const res = await fetch(`${CF_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = await res.json() as { success: boolean; errors?: unknown[]; result?: unknown };
  if (!body.success) {
    throw new Error(`Cloudflare API error: ${JSON.stringify(body.errors)}`);
  }
  return body.result;
}

function accountId(): string {
  const id = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  if (!id) throw new Error("CLOUDFLARE_ACCOUNT_ID is not configured.");
  return id;
}

export const cloudflareTools: MCPTool[] = [
  {
    name: "cf_list_deployments",
    description: "List recent Cloudflare Pages deployments for a project.",
    inputSchema: {
      type: "object",
      properties: {
        project_name: { type: "string", description: "Cloudflare Pages project name" },
      },
      required: ["project_name"],
    },
  },
  {
    name: "cf_get_deployment",
    description: "Get details of a specific Cloudflare Pages deployment.",
    inputSchema: {
      type: "object",
      properties: {
        project_name: { type: "string" },
        deployment_id: { type: "string" },
      },
      required: ["project_name", "deployment_id"],
    },
  },
  {
    name: "cf_trigger_deploy",
    description: "Trigger a new Cloudflare Pages deployment from the latest commit.",
    inputSchema: {
      type: "object",
      properties: {
        project_name: { type: "string" },
        branch: { type: "string", description: "Branch to deploy (default: production branch)" },
      },
      required: ["project_name"],
    },
  },
  {
    name: "cf_purge_cache",
    description: "Purge Cloudflare cache for a zone (all files or specific URLs).",
    inputSchema: {
      type: "object",
      properties: {
        zone_id: { type: "string", description: "Cloudflare Zone ID" },
        purge_everything: { type: "boolean", description: "Purge all cached files (default: true)" },
        files: {
          type: "array",
          description: "Specific URLs to purge (used when purge_everything is false)",
          items: { type: "string" },
        },
      },
      required: ["zone_id"],
    },
  },
  {
    name: "cf_list_workers",
    description: "List Cloudflare Workers scripts for the account.",
    inputSchema: { type: "object", properties: {} },
  },
];

export async function handleCloudflareTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    if (name === "cf_list_deployments") {
      const aid = accountId();
      const data = await cfFetch(
        `/accounts/${aid}/pages/projects/${args.project_name}/deployments`
      );
      return ok(data);
    }

    if (name === "cf_get_deployment") {
      const aid = accountId();
      const data = await cfFetch(
        `/accounts/${aid}/pages/projects/${args.project_name}/deployments/${args.deployment_id}`
      );
      return ok(data);
    }

    if (name === "cf_trigger_deploy") {
      const aid = accountId();
      const body: Record<string, unknown> = {};
      if (args.branch) body.branch = args.branch;
      const data = await cfFetch(
        `/accounts/${aid}/pages/projects/${args.project_name}/deployments`,
        { method: "POST", body: JSON.stringify(body) }
      );
      return ok(data);
    }

    if (name === "cf_purge_cache") {
      const purgeAll = args.purge_everything !== false;
      const body = purgeAll
        ? { purge_everything: true }
        : { files: args.files ?? [] };
      const data = await cfFetch(
        `/zones/${args.zone_id}/purge_cache`,
        { method: "POST", body: JSON.stringify(body) }
      );
      return ok(data);
    }

    if (name === "cf_list_workers") {
      const aid = accountId();
      const data = await cfFetch(`/accounts/${aid}/workers/scripts`);
      return ok(data);
    }

    return err(`Unhandled cloudflare tool: ${name}`);
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
