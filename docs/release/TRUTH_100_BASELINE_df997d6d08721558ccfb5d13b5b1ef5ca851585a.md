# APEX-TRUTH-100 BASELINE
**HEAD SHA:** df997d6d08721558ccfb5d13b5b1ef5ca851585a
**TAG:** v1.8.3-58-gdf997d6d
**DATE:** 2026-07-31

## File Statistics
- **ts:** 234
- **tsx:** 88
- **migrations:** 113
- **rollback:** 4
- **edge:** 38
- **workflows:** 22
- **ci_scripts:** 39

## Baseline Gate Run Results
- `npx tsc -b --noEmit`: FAILED (Property 'send' does not exist on type 'S3Client' in src/lib/storage/providers/s3.ts)
- `npx eslint .`: PASSED
- `npm run docs:check`: PASSED
- `npm audit`: FAILED (EOVERRIDE due to dependabot PR #1664 mismatched resolutions and overrides for postcss)

**CONCLUSION**: The ground truth diverges from README assertions (1048eb5 vs df997d6d), and production build gates fail due to TypeScript compilation and npm EOVERRIDE errors directly related to PR #1664 dependency mutations. Baseline established.
