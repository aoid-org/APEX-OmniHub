/**
 * GitHub Repository Management Tools (6 tools)
 * Uses GITHUB_TOKEN env var for authentication.
 */

import type { MCPTool, ToolCallResult } from "./registry.ts";
import { ok, err } from "./registry.ts";

const GH_API = "https://api.github.com";

async function ghFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) throw new Error("GITHUB_TOKEN is not configured.");

  const res = await fetch(`${GH_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `GitHub API error ${res.status}: ${(body as { message?: string }).message ?? res.statusText}`
    );
  }
  return body;
}

export const githubTools: MCPTool[] = [
  {
    name: "github_list_repos",
    description: "List repositories for an owner (user or org).",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "GitHub user or org name" },
        type: { type: "string", description: "all | public | private (default: all)" },
        per_page: { type: "number", description: "Results per page (max 100, default 30)" },
      },
      required: ["owner"],
    },
  },
  {
    name: "github_get_file",
    description: "Get contents of a file in a repository.",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: { type: "string", description: "File path in the repo" },
        ref: { type: "string", description: "Branch, tag, or commit SHA (default: default branch)" },
      },
      required: ["owner", "repo", "path"],
    },
  },
  {
    name: "github_list_branches",
    description: "List branches in a repository.",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        per_page: { type: "number" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "github_create_branch",
    description: "Create a new branch from a source ref.",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        branch: { type: "string", description: "New branch name" },
        from_ref: { type: "string", description: "Source branch/SHA (default: default branch)" },
      },
      required: ["owner", "repo", "branch"],
    },
  },
  {
    name: "github_push_files",
    description: "Push one or more files to a branch (creates or updates).",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        branch: { type: "string" },
        message: { type: "string", description: "Commit message" },
        files: {
          type: "array",
          description: "Array of { path, content } objects (content is plain text)",
          items: { type: "object" },
        },
      },
      required: ["owner", "repo", "branch", "message", "files"],
    },
  },
  {
    name: "github_create_pr",
    description: "Create a pull request.",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        head: { type: "string", description: "Source branch" },
        base: { type: "string", description: "Target branch (default: main)" },
        draft: { type: "boolean" },
      },
      required: ["owner", "repo", "title", "head"],
    },
  },
];

async function ghListRepos(args: Record<string, unknown>): Promise<ToolCallResult> {
  const type = (args.type as string | undefined) ?? "all";
  const perPage = Math.min(Number(args.per_page ?? 30), 100);
  const data = await ghFetch(
    `/users/${String(args.owner)}/repos?type=${type}&per_page=${perPage}`
  );
  const repos = (data as Array<{ name: string; full_name: string; private: boolean; default_branch: string; description: string | null }>)
    .map((r) => ({ name: r.name, full_name: r.full_name, private: r.private, default_branch: r.default_branch, description: r.description }));
  return ok(repos);
}

async function ghGetFile(args: Record<string, unknown>): Promise<ToolCallResult> {
  const ref = args.ref ? `?ref=${String(args.ref)}` : "";
  const data = await ghFetch(
    `/repos/${String(args.owner)}/${String(args.repo)}/contents/${String(args.path)}${ref}`
  ) as { content?: string; encoding?: string; name: string; path: string; sha: string; size: number };
  if (data.encoding === "base64" && data.content) {
    data.content = atob(data.content.replaceAll('\n', ''));
  }
  return ok(data);
}

async function ghListBranches(args: Record<string, unknown>): Promise<ToolCallResult> {
  const perPage = Math.min(Number(args.per_page ?? 30), 100);
  const data = await ghFetch(
    `/repos/${String(args.owner)}/${String(args.repo)}/branches?per_page=${perPage}`
  );
  return ok(data);
}

async function ghCreateBranch(args: Record<string, unknown>): Promise<ToolCallResult> {
  let sha: string;
  if (args.from_ref) {
    const refData = await ghFetch(
      `/repos/${String(args.owner)}/${String(args.repo)}/git/refs/heads/${String(args.from_ref)}`
    ) as { object: { sha: string } };
    sha = refData.object.sha;
  } else {
    const repo = await ghFetch(
      `/repos/${String(args.owner)}/${String(args.repo)}`
    ) as { default_branch: string };
    const defaultRef = await ghFetch(
      `/repos/${String(args.owner)}/${String(args.repo)}/git/refs/heads/${repo.default_branch}`
    ) as { object: { sha: string } };
    sha = defaultRef.object.sha;
  }
  const result = await ghFetch(
    `/repos/${String(args.owner)}/${String(args.repo)}/git/refs`,
    { method: "POST", body: JSON.stringify({ ref: `refs/heads/${String(args.branch)}`, sha }) }
  );
  return ok(result);
}

async function ghPushFiles(args: Record<string, unknown>): Promise<ToolCallResult> {
  const files = args.files as Array<{ path: string; content: string }>;
  const results = [];
  for (const file of files) {
    let existingSha: string | undefined;
    try {
      const existing = await ghFetch(
        `/repos/${String(args.owner)}/${String(args.repo)}/contents/${file.path}?ref=${String(args.branch)}`
      ) as { sha?: string };
      existingSha = existing.sha;
    } catch {
      // File does not exist yet — no SHA needed
    }
    const bytes = new TextEncoder().encode(file.content);
    const content = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
    const payload: Record<string, unknown> = { message: args.message, content, branch: args.branch };
    if (existingSha) payload.sha = existingSha;
    const result = await ghFetch(
      `/repos/${String(args.owner)}/${String(args.repo)}/contents/${file.path}`,
      { method: "PUT", body: JSON.stringify(payload) }
    );
    results.push(result);
  }
  return ok(results);
}

async function ghCreatePr(args: Record<string, unknown>): Promise<ToolCallResult> {
  const result = await ghFetch(
    `/repos/${String(args.owner)}/${String(args.repo)}/pulls`,
    {
      method: "POST",
      body: JSON.stringify({
        title: args.title,
        body: args.body ?? "",
        head: args.head,
        base: args.base ?? "main",
        draft: args.draft ?? false,
      }),
    }
  );
  return ok(result);
}

export async function handleGithubTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    switch (name) {
      case "github_list_repos":    return ghListRepos(args);
      case "github_get_file":      return ghGetFile(args);
      case "github_list_branches": return ghListBranches(args);
      case "github_create_branch": return ghCreateBranch(args);
      case "github_push_files":    return ghPushFiles(args);
      case "github_create_pr":     return ghCreatePr(args);
      default:                     return err(`Unhandled github tool: ${name}`);
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
