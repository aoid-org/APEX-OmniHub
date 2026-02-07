import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", ".turbo", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-explicit-any": ["error", {
        fixToUnknown: true,
        ignoreRestArgs: false
      }],
      "@typescript-eslint/no-empty-object-type": "warn",
      "no-console": ["warn", {
        allow: ["warn", "error"]
      }],
    },
  },
  // Relaxed rules for CLI scripts, simulation, and sandbox files
  {
    files: ["tools/sim/**/*.ts", "tools/scripts/**/*.ts", "tools/sandbox/**/*.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Allow console.log in monitoring/debugging infrastructure (legacy code)
  // BACKLOG: Migrate to structured logging (tracked in project board)
  {
    files: [
      "apps/dashboard/src/lib/monitoring.ts",
      "apps/dashboard/src/lib/debug-logger.ts",
      "apps/dashboard/src/lib/offline.ts",
      "apps/dashboard/src/lib/config.ts",
      "apps/dashboard/src/lib/lovableConfig.ts",
      "apps/dashboard/src/lib/security.ts",
      "apps/dashboard/src/lib/database/providers/supabase.ts",
      "apps/dashboard/src/lib/storage/providers/supabase.ts",
      "apps/dashboard/src/integrations/supabase/client.ts",
      "apps/dashboard/src/omniconnect/**/*.ts",
      "apps/dashboard/src/armageddon/worker.ts",
      "apex-resilience/**/*.ts",
      "apps/dashboard/src/pages/**/*.tsx",
      "tests/**/*.ts",
      "infra/supabase/functions/**/*.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },
);
