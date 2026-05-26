import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/.nyc_output/**",
      "**/.claude/**",
      "**/components/ui/**", // Shadcn UI components often have lint warnings we don't want to fix
      "services/contracts/typechain-types/**",
      "hero-visual-original.tsx",
      // Playwright integration-harness: fixtures use Playwright's `use` callback
      // which ESLint misidentifies as React Hook violations. This is test infra,
      // not React app code — react-hooks rules don't apply here.
      "integration-harness/**",
      "APEX-OmniHub/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
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
    files: ["sim/**/*.ts", "scripts/**/*.ts", "sandbox/**/*.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "warn",  // Allow any in simulation code
    },
  },
  // Lock 2: Ban hardcoded Omnidash app names in OmniDash surfaces.
  // All mapping must derive from src/contracts/omnidash.contract.ts or APP_REGISTRY.
  {
    files: [
      "apps/omnihub-site/src/pages/DashboardOverview/**/*.tsx",
      "apps/omnihub-site/src/layouts/OmniDash*.tsx",
      "src/components/OmniDash*.tsx",
    ],
    rules: {
      "no-restricted-syntax": ["error",
        {
          selector: "Literal[value=/^(OmniBoard|OmniPort|Maestro|Fortress|Orchestrator|OmniSkills|PhysiOmni|Audits|Links|Automations|Workflows|Files|Billing|Settings)$/]",
          message: "Hardcoded app name detected. Import from src/contracts/omnidash.contract.ts instead.",
        },
      ],
    },
  },
  // Infrastructure & connectors: console.log guarded by import.meta.env.DEV,
  // console.warn/error used for operational diagnostics. All production-safe.
  {
    files: [
      "src/lib/monitoring.ts",
      "src/lib/debug-logger.ts",
      "src/lib/config.ts",
      "src/lib/security.ts",
      "src/lib/omni-sentry.ts",
      "src/lib/offline.ts",
      "src/lib/database/providers/supabase.ts",
      "src/lib/storage/providers/supabase.ts",
      "src/integrations/supabase/client.ts",
      "src/omniconnect/**/*.ts",
      "src/worker.ts",
      "apex-resilience/**/*.ts",
      "tests/**/*.ts",
      "supabase/functions/**/*.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },
);
