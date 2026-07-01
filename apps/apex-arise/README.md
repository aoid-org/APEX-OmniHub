# A.R.I.S.E. — Phase 0: Structural Observatory

**Scope: measurement only.** This package runs four deterministic static-analysis
tools against the repo, combines their results into a single geometric-mean
composite score, and writes one dated markdown snapshot. It makes **no**
autonomous code changes, opens **no** pull requests itself, and never fails a
build (`arise.yml` runs with `continue-on-error: true` at both job and step
level). See the parent plan document (`ARISE-Phase0-ClaudeCode-Execution-Contract.md`,
shared with this session) for the full Phase 0 rationale and the locked
architecture decisions this package implements.

`apps/apex-arise` is a fully self-contained package: its own `package.json`,
its own `bun install`, its own local `node_modules`. It does not rely on
root-workspace resolution.

## Running locally

```bash
cd apps/apex-arise
bun install
bun run arise:scan
```

This runs all four signal collectors, computes the composite score, and
writes `memory/omni-recall/docs/CURRENT_ARISE_STRUCTURAL_BASELINE_<YYYY_MM_DD>.md`
at the repo root. The scan always exits `0`; a signal that fails to run is
recorded in the snapshot as a degraded run rather than crashing the process.

Other useful commands (run from `apps/apex-arise`):

```bash
bun run typecheck   # tsc --noEmit
bun run lint        # eslint . (uses the repo's root flat config)
bun run test        # vitest run — unit tests for the composite/scoring math
```

## The five signals

| Signal | Tool | What it measures |
|---|---|---|
| Acyclicity | [`madge`](https://github.com/pahen/madge) `--circular` | Circular import chains |
| Modularity | [`dependency-cruiser`](https://github.com/sverweij/dependency-cruiser) | Forbidden-dependency rule violations (`config/.dependency-cruiser.cjs`) |
| Redundancy | [`jscpd`](https://github.com/kucherenko/jscpd) | Duplicated code blocks (`config/.jscpd.json`, `minTokens: 50`, `minLines: 5`) |
| Depth | [`ts-morph`](https://ts-morph.com/) (in-process) | Max control-flow nesting per file |
| Equality | [`ts-morph`](https://ts-morph.com/) (in-process) | LOC distribution / monolithic-file outliers |

Each signal collector (`src/signals/*.ts`) returns a `SignalScore` in the
`[0, 1]` range, normalized independently — see the "Methodology Note" section
of any generated snapshot for the exact formula used in that run (formulas
are documented inline in each collector, not duplicated here to avoid drift).

## Composite score

```
composite = (S_acyclicity * S_modularity * S_redundancy * S_depth * S_equality) ** (1/5)
```

Geometric mean. If any of the five signals fails to produce a score, the
composite is **not** computed with a substituted default — the run is
recorded in the snapshot as degraded, listing which signal(s) failed and why.
`src/aggregate.ts` enforces this (see `tests/aggregate.test.ts` for the
zero-collapse and fail-loud unit tests).

## Reading a snapshot

Each snapshot (`memory/omni-recall/docs/CURRENT_ARISE_STRUCTURAL_BASELINE_*.md`)
has:

- A composite score (or a degraded-run explanation).
- A per-signal table: score + a one-line raw finding (e.g. cycle count,
  violation count, duplication percentage, deepest nesting, largest file).
- The exact scan scope (directories) for that run.
- The exact normalization formulas used for that run.

A low score on the first baseline is informative, not alarming — it is a
starting point for future phases, not a build gate. Phase 0 takes no
autonomous action on any finding.

## Scan scope

Six directories are scanned: root `src/`, plus every `apps/*/src` and
`packages/*/src` confirmed to exist in the repo at the time this package was
built (`apps/omnihub-proof/src`, `apps/omnihub-site/src`,
`packages/apex-sales/src`, `packages/core/src`, `packages/infrastructure/src`).
See `src/paths.ts` for the exact list.
