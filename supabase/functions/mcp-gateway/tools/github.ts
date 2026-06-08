/**
 * GitHub Repository Management Tools (6 tools)
 * Uses GITHUB_TOKEN env var for authentication.
 */

import type { MCPTool, ToolCallResult } from "./registry.ts";
import { ok, err } from "./registry.ts";

const GH_API = "https://api.github.com";

async function ghFetch(
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) throw new Error("GITHUB_TOKEN is not configured.");

  const res = await fetch(`${GH_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
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

export async function handleGithubTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    if (name === "github_list_repos") {
      const type = (args.type as string | undefined) ?? "all";
      const perPage = Math.min(Number(args.per_page ?? 30), 100);
      const data = await ghFetch(
        `/users/${args.owner}/repos?type=${type}&per_page=${perPage}`
      );
      const repos = (data as Array<{ name: string; full_name: string; private: boolean; default_branch: string; description: string | null }>)
        .map((r) => ({ name: r.name, full_name: r.full_name, private: r.private, default_branch: r.default_branch, description: r.description }));
      return ok(repos);
    }

    if (name === "github_get_file") {
      const ref = args.ref ? `?ref=${args.ref}` : "";
      const data = await ghFetch(
        `/repos/${args.owner}/${args.repo}/contents/${args.path}${ref}`
      ) as { content?: string; encoding?: string; name: string; path: string; sha: string; size: number };
      if (data.encoding === "base64" && data.content) {
        data.content = atob(data.content.replace(/\n/g, ""));
      }
      return ok(data);
    }

    if (name === "github_list_branches") {
      const perPage = Math.min(Number(args.per_page ?? 30), 100);
      const data = await ghFetch(
        `/repos/${args.owner}/${args.repo}/branches?per_page=${perPage}`
      );
      return ok(data);
    }

    if (name === "github_create_branch") {
      let sha: string;
      if (args.from_ref) {
        const ref = await ghFetch(
          `/repos/${args.owner}/${args.repo}/git/refs/heads/${args.from_ref}`
        ) as { object: { sha: string } };
        sha = ref.object.sha;
      } else {
        const repo = await ghFetch(`/repos/${args.owner}/${args.repo}`) as { default_branch: string };
        const defaultRef = await ghFetch(
          `/repos/${args.owner}/${args.repo}/git/refs/heads/${repo.default_branch}`
        ) as { object: { sha: string } };
        sha = defaultRef.object.sha;
      }
      const result = await ghFetch(
        `/repos/${args.owner}/${args.repo}/git/refs`,
        {
          method: "POST",
          body: JSON.stringify({ ref: `refs/heads/${args.branch}`, sha }),
        }
      );
      return ok(result);
    }

    if (name === "github_push_files") {
      const files = args.files as Array<{ path: string; content: string }>;
      const results = [];
      for (const file of files) {
        // Check if file exists to get its SHA
        let existingSha: string | undefined;
        try {
          const existing = await ghFetch(
            `/repos/${args.owner}/${args.repo}/contents/${file.path}?ref=${args.branch}`
          ) as { sha?: string };
          existingSha = existing.sha;
        } catch {
          // File doesn't exist yet
        }
        const payload: Record<string, unknown> = {
          message: args.message,
          content: btoa(unescape(encodeURIComponent(file.content))),
          branch: args.branch,
        };
        if (existingSha) payload.sha = existingSha;
        const result = await ghFetch(
          `/repos/${args.owner}/${args.repo}/contents/${file.path}`,
          { method: "PUT", body: JSON.stringify(payload) }
        );
        results.push(result);
      }
      return ok(results);
    }

    if (name === "github_create_pr") {
      const result = await ghFetch(
        `/repos/${args.owner}/${args.repo}/pulls`,
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

    return err(`Unhandled github tool: ${name}`);
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
