import path from "node:path";

export const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
export const ARISE_ROOT = path.resolve(import.meta.dirname, "..");

export const SCAN_TARGETS = [
  "src",
  "apps/omnihub-proof/src",
  "apps/omnihub-site/src",
  "packages/apex-sales/src",
  "packages/core/src",
  "packages/infrastructure/src",
];
