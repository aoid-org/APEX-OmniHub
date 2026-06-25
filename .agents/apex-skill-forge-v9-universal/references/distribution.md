---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Distribution

Read this at Phase 6 (PUBLISH), or when preparing marketplace listings.

## Why distribution is part of the skill, not an afterthought

A skill install is a zero-cost top-of-funnel lead only if the path from listing → running skill is one action. Every extra step (clone, read docs, figure out the folder) loses a fraction of installs. The forge therefore treats README install lines, packaging, and checksums as build outputs, gated by the same lint as the code.

## Install channels (emit all three in every README)

| Channel | Command / action | Notes |
|---|---|---|
| skills.sh ecosystem | `npx skills add <repo-url> --skill <name>` | Works for any public Git repo following the open Agent Skills format |
| Claude Code plugins | `/plugin marketplace add <org>/<marketplace-repo>` then `/plugin` to install | Requires a `marketplace.json` catalog repo pointing at skill source repos |
| Claude Code manual | copy folder to `~/.claude/skills/` (global) or `.claude/skills/` (project) | Always works; good fallback line |
| claude.ai | upload `dist/<name>-<version>.skill` (zip) under Settings → Capabilities | The `forge.py pack` artifact is exactly this file |

The packed `.skill` + `.sha256` pair is the provenance unit. Marketplaces and Anthropic's own guidance tell users to install only from trusted sources — a published checksum plus a public source repo is how a small vendor manufactures that trust.

## Listing targets (verified active as of 2026-06; ecosystem shifts fast — re-verify quarterly)

| Target | Mechanism |
|---|---|
| AgentSkill.club | Community marketplace; syncs/curates GitHub repos |
| skills.sh | Open directory; one-command install |
| SkillHub (skillhub.club) | AI-evaluated catalog with quality scores — a scorecard-bearing package is built for this channel |
| claudeskills.info, agent-skills.cc, SkillsMP, LobeHub, mcpmarket.com | Aggregators/indexes; ensure repo README is self-explanatory since they scrape it |
| GitHub awesome-lists | PR-based curation; acceptance favors clear READMEs with demos |
| Own marketplace repo | `marketplace.json` with `{"name", "description", "source": {"source": "github", "repo": "<org>/<repo>"}}` entries — lets `/plugin marketplace add` serve the whole APEX catalog at once |

## README distribution pack (lint checks `dist-*`)

1. `## Install` within the first screen — command block, no prose before the command.
2. `## Before / After` — one real task, measured columns, numbers sourced from `scorecard.json` (state that in the section).
3. Runtime footer — one line linking the runtime the skill targets (APEX skills: APEX-OmniHub). One line, every package: the catalog itself becomes the funnel.
4. Verify block — `sha256sum -c` against the shipped checksum.

## Publish checklist

```
[ ] forge.py lint <dir> --strict  → 0 FAIL
[ ] forge.py score <dir>          → fresh scorecard.json committed
[ ] forge.py pack <dir>           → dist/<name>-<version>.skill + .sha256
[ ] Source repo public, README renders, install command copy-pastes clean
[ ] MANIFEST.json version bumped; supersedes field names the prior version
[ ] marketplace.json entry added/updated in the catalog repo
[ ] Listing submitted/refreshed on targets above
```

UNCERTAIN by design: marketplace submission UIs and acceptance criteria change without notice. The checklist pins what the package controls; verify each target's current process at submit time rather than trusting cached instructions.
