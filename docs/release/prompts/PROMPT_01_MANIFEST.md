# PROMPT 01 MANIFEST

## Package manager decision
- Primary JS package manager: **Bun** (`packageManager: bun@1.x` in root `package.json`).
- Deterministic install command: `bun install --frozen-lockfile`.

## Changed files + SHA-256
- package.json `f09f865218cb8c7f88f5983bc39f23d40efc7a67e5a9c29bad806df0a0897035`
- scripts/verify-ci-integrity.mjs `dbae284e30c7576b141d6c517a6dfc2c30b9e76a905222ef593753b204f0e4b4`
- .github/workflows/release.yml `80b52f79674f80032a0a28102d604427b5e86f487c852bc2692b741188bc8752`
- .github/workflows/rsi-governance-gate.yml `638398e94c9cb404b60c4cb38e9d87e2415f70da0836bfe7201de47393c98b91`
- .github/workflows/apex-governance.yml `02319c1835979819cac2745abf28c0f406b1d60b2c8922f8bce8f6c7bc202eed`
- .github/workflows/ci-runtime-gates.yml `b6d3da2c026eb4abc6a549635a2d378f7737ddf4212f7f50c59d61a5884c40d8`
- .github/workflows/deploy-web3-functions.yml `d9d02c05946936c8e638616b4a17ec8a86a5916760fb33f3a2113fadea34960d`
- .github/workflows/mobile-build-verify.yml `e1974aae0ee294793a2f8a8e1e8d87e59c4eafa05751bfaea9dd9ccf7f830100`
- .github/workflows/orchestrator-ci.yml `933a82b1a0e28de1b03e443f0a79456e94e276805f0c3b61144362feec052f56`
- .github/workflows/production-readiness.yml `a063c41e226942d89af5cfd8380bd9cb3a6945e3a6983e33843244921a16b5a9`
- .github/workflows/secret-scanning.yml `17bdd05de9b199af1879eee1c80925b48eddf8f9a7db0712fb7af00f481538de`
- docs/release/prompts/README.md `31aadec84dc4abff1182d0b46065ca9be3d13224c3233c6be06716d764135e00`
- docs/release/GO_NO_GO_CHECKLIST.md `5e3000ba04f65d10c7d71d54be9bd6025e7cb888ce920d1e99f9b99365e0015c`

## Validation commands
- `bun install --frozen-lockfile` => PASS
- `bun run verify:ci-integrity` => PASS
- `bun run verify:release` => FAIL (`verify:types` failed with existing TypeScript compile errors in `apps/omnihub-site/dashboard/*` and `tests/*`)

## Failures fixed
- Added deterministic release verification scripts and CI integrity scanner.
- Removed `|| true` from failing workflows detected by CI integrity gate.
- Replaced placeholder RSI gate with executable RSI policy/evidence chain.

## Remaining limitations
- `verify:release` is fail-closed at `verify:types`; downstream verify gates are not yet reached.
