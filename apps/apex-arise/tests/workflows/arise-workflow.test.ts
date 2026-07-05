import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflowPath = resolve(process.cwd(), "../../.github/workflows/arise.yml");
const workflow = readFileSync(workflowPath, "utf8");

describe("A.R.I.S.E. snapshot publication workflow", () => {
  it("publishes generated snapshots through one rolling automation PR instead of spamming protected branches", () => {
    expect(workflow).toContain("Publish dated snapshot rolling PR");
    expect(workflow).toContain("pull-requests: write");
    expect(workflow).toContain('branch="automation/arise-snapshot-current"');
    expect(workflow).toContain('gh pr list --state open');
    expect(workflow).toContain('Updated existing A.R.I.S.E. snapshot PR');
    expect(workflow).toContain('git push origin "HEAD:refs/heads/$branch"');
    expect(workflow).toContain("Refusing to publish A.R.I.S.E. snapshots to protected branch target");
    expect(workflow).toContain("Refusing to publish A.R.I.S.E. snapshots to unexpected branch target");
    expect(workflow).toContain("gh pr create");
    expect(workflow).toContain('--base "${{ github.ref_name }}"');
    expect(workflow).toContain('--head "$branch"');
    expect(workflow).not.toContain("[skip ci]");

    expect(workflow).not.toMatch(/git\s+push\s+origin\s+(?:HEAD:)?(?:main|master)\b/);
    expect(workflow).not.toMatch(/git\s+push\s+origin\s+HEAD:refs\/heads\/(?:main|master)\b/);
    expect(workflow).not.toMatch(/git\s+push\s+origin\s+HEAD:\$\{\{\s*github\.ref_name\s*\}\}/);
    expect(workflow).not.toMatch(/git\s+push\s+origin\s+HEAD:\$GITHUB_REF_NAME\b/);
  });
});
