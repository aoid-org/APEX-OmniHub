/**
 * OmniBoard Store — Alias Bridge
 *
 * The canonical store lives at the monorepo root:
 *   src/stores/omniBoardStore.ts
 *
 * The Vite @/ alias in apps/omnihub-site maps to ./src, so this barrel
 * re-exports everything to make @/stores/omniBoardStore resolve correctly
 * from any file within apps/omnihub-site without duplicating source of truth.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

export * from '../../../../src/stores/omniBoardStore';
